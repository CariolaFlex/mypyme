-- ============================================================
-- Gestionala — Mercado Pago Point (add-on POS), Fase 1
-- Cobro con tarjeta disparado desde el POS contra una terminal Point Smart.
--
-- Tablas: mp_conexiones (OAuth por comerciante), mp_dispositivos (terminales),
--         mp_cobros (payment intents ↔ ventas).
-- Refactor: process_sale → wrapper sobre process_sale_core (DEFINER, empresa
--           por parámetro) para que el webhook (service_role, SIN JWT) pueda
--           registrar la venta. registrar_venta_mp es el puente.
--
-- SIN split/fee en esta fase. Los tokens OAuth se guardan CIFRADOS desde la app
-- (AES-256-GCM en Node); la DB solo ve el ciphertext.
-- ============================================================

-- ------------------------------------------------------------
-- mp_conexiones — una conexión OAuth por empresa.
-- ------------------------------------------------------------
CREATE TABLE public.mp_conexiones (
  empresa_id            UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  mp_user_id            TEXT,                       -- id del comerciante en MP
  access_token_cifrado  TEXT NOT NULL,              -- AES-256-GCM (nunca en claro)
  refresh_token_cifrado TEXT,                        -- AES-256-GCM
  expira_en             TIMESTAMPTZ,                 -- vencimiento del access_token
  scope                 TEXT,
  estado                TEXT NOT NULL DEFAULT 'conectada'
                          CHECK (estado IN ('conectada','revocada','error')),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- mp_dispositivos — terminales Point vinculadas (Fase 1: 1 por empresa, pero
-- el modelo soporta varias).
-- ------------------------------------------------------------
CREATE TABLE public.mp_dispositivos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,                          -- id del device en MP
  nombre      TEXT,
  modo        TEXT,                                   -- PDV / STANDALONE
  estado      TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo')),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, device_id)
);

-- ------------------------------------------------------------
-- mp_cobros — payment intent de Point ↔ venta del POS.
-- payload guarda lineas/pagos/sesion para que el webhook reconstruya la venta.
-- ------------------------------------------------------------
CREATE TABLE public.mp_cobros (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id           UUID NOT NULL,                   -- UUID de cliente (idempotencia con process_sale)
  payment_intent_id  TEXT UNIQUE,                     -- id del intent en MP
  device_id          TEXT NOT NULL,
  monto              NUMERIC(14,2) NOT NULL,
  estado             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (estado IN ('pending','approved','rejected','canceled')),
  metodo             TEXT,                            -- debito / credito (si MP lo informa)
  payload            JSONB NOT NULL,                  -- { lineas, pagos, sesion_caja_id }
  raw                JSONB,                           -- última respuesta cruda de MP
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mp_cobros_venta   ON public.mp_cobros (empresa_id, venta_id);
CREATE INDEX idx_mp_cobros_intent  ON public.mp_cobros (payment_intent_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.mp_conexiones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mp_cobros       ENABLE ROW LEVEL SECURITY;

-- Conexiones: el tenant puede VER su conexión (estado), pero las escrituras y la
-- lectura de los tokens van por el admin client (service_role). No hay política
-- de escritura para authenticated → solo service_role inserta/actualiza.
CREATE POLICY mpconx_select ON public.mp_conexiones
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());

-- Dispositivos: lectura del tenant, escritura solo admin (sin secretos).
CREATE POLICY mpdisp_select ON public.mp_dispositivos
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY mpdisp_admin_write ON public.mp_dispositivos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- Cobros: el POS lee su propio cobro para hacer poll del estado. Escritura solo
-- service_role (route /api/mp/cobro y webhook).
CREATE POLICY mpcobros_select ON public.mp_cobros
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());

-- ------------------------------------------------------------
-- Grants (auto-expose OFF → explícitos). service_role para el código server.
-- ------------------------------------------------------------
GRANT SELECT                         ON public.mp_conexiones   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_dispositivos TO authenticated;
GRANT SELECT                         ON public.mp_cobros       TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_conexiones   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_dispositivos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_cobros       TO service_role;

-- Defensa en profundidad: el browser (authenticated) NUNCA debe leer los tokens.
-- Aunque el código solo los toca con el admin client, revocamos el SELECT de esas
-- columnas para que un `select *` del tenant falle en vez de filtrarlos.
REVOKE SELECT (access_token_cifrado, refresh_token_cifrado)
  ON public.mp_conexiones FROM authenticated;

-- ============================================================
-- Refactor de process_sale → núcleo reutilizable + wrapper.
-- ============================================================

-- ------------------------------------------------------------
-- process_sale_core: la lógica real de registrar una venta, con la empresa por
-- parámetro (no por JWT). SECURITY DEFINER → la llaman tanto el wrapper del POS
-- como registrar_venta_mp (webhook). REVOCADA de authenticated: nadie la invoca
-- directo con una empresa arbitraria.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale_core(
  p_empresa        UUID,
  p_venta_id       UUID,
  p_lineas         JSONB,
  p_pagos          JSONB,
  p_usuario_id     UUID,
  p_sesion_caja_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa   UUID := p_empresa;
  v_bodega    UUID;
  v_total     NUMERIC := 0;
  v_neto      NUMERIC := 0;
  v_iva       NUMERIC := 0;
  v_recibido  NUMERIC := 0;
  v_qty       NUMERIC;
  v_lt        NUMERIC;
  v_ln        NUMERIC;
  v_li        NUMERIC;
  v_monto     NUMERIC;
  v_rec       NUMERIC;
  v_tipo      TEXT;
  v_pago_id   UUID;
  rec         JSONB;
  prod        public.productos%ROWTYPE;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa' USING ERRCODE='28000'; END IF;

  -- Idempotencia: si ya existe esa venta, no reprocesar.
  IF EXISTS (SELECT 1 FROM public.ventas WHERE id = p_venta_id) THEN
    RETURN p_venta_id;
  END IF;

  SELECT id INTO v_bodega FROM public.bodegas
  WHERE empresa_id = v_empresa AND es_default LIMIT 1;

  INSERT INTO public.ventas (id, empresa_id, usuario_id, bodega_id, sesion_caja_id, estado)
  VALUES (p_venta_id, v_empresa, p_usuario_id, v_bodega, p_sesion_caja_id, 'completada')
  ON CONFLICT (id) DO NOTHING;

  FOR rec IN SELECT jsonb_array_elements(p_lineas) LOOP
    SELECT * INTO prod FROM public.productos
    WHERE id = (rec->>'producto_id')::UUID AND empresa_id = v_empresa;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto inválido' USING ERRCODE='P0002'; END IF;

    v_qty := (rec->>'cantidad')::NUMERIC;
    v_lt  := coalesce(prod.precio_total, 0) * v_qty;
    v_ln  := CASE WHEN coalesce(prod.tasa_iva,0) > 0
                  THEN round(v_lt / (1 + prod.tasa_iva/100), 2) ELSE v_lt END;
    v_li  := v_lt - v_ln;

    INSERT INTO public.ventas_lineas (
      empresa_id, venta_id, producto_id, cantidad, precio_neto_unit,
      precio_total_unit, tasa_iva, monto_neto, monto_iva, monto_total)
    VALUES (v_empresa, p_venta_id, prod.id, v_qty, coalesce(prod.precio_neto,0),
            coalesce(prod.precio_total,0), coalesce(prod.tasa_iva,0), v_ln, v_li, v_lt);

    v_total := v_total + v_lt; v_neto := v_neto + v_ln; v_iva := v_iva + v_li;

    IF prod.controla_stock THEN
      INSERT INTO public.movimientos_inventario (empresa_id, producto_id, bodega_id, cantidad, tipo)
      VALUES (v_empresa, prod.id, v_bodega, -v_qty, 'venta');
    END IF;
  END LOOP;

  FOR rec IN SELECT jsonb_array_elements(p_pagos) LOOP
    v_monto := (rec->>'monto')::NUMERIC;
    v_rec   := coalesce((rec->>'monto_recibido')::NUMERIC, v_monto);

    INSERT INTO public.ventas_pagos (empresa_id, venta_id, metodo_pago_id, monto, monto_recibido)
    VALUES (v_empresa, p_venta_id, (rec->>'metodo_pago_id')::UUID, v_monto, v_rec)
    RETURNING id INTO v_pago_id;

    v_recibido := v_recibido + v_rec;

    -- Solo el efectivo afecta el conteo físico de la caja.
    SELECT tipo INTO v_tipo FROM public.metodos_pago WHERE id = (rec->>'metodo_pago_id')::UUID;
    IF p_sesion_caja_id IS NOT NULL AND v_tipo = 'cash' THEN
      INSERT INTO public.movimientos_caja (empresa_id, sesion_caja_id, tipo, monto, venta_id)
      VALUES (v_empresa, p_sesion_caja_id, 'venta', v_monto, p_venta_id);
    END IF;
  END LOOP;

  UPDATE public.ventas
  SET monto_neto = v_neto, monto_iva = v_iva, monto_total = v_total,
      monto_recibido = v_recibido, vuelto = greatest(v_recibido - v_total, 0)
  WHERE id = p_venta_id;

  RETURN p_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_sale_core(UUID,UUID,JSONB,JSONB,UUID,UUID) FROM anon, public, authenticated;

-- ------------------------------------------------------------
-- process_sale: mismo contrato/grant de siempre (lo llama el POS con su JWT),
-- ahora wrapper DEFINER que delega en el núcleo con la empresa del token.
-- get_tenant_id() lee el GUC del JWT igual bajo DEFINER (idéntico precedente:
-- reporte_ventas_por_cajero). El camino del POS no cambia de comportamiento.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale(
  p_venta_id      UUID,
  p_lineas        JSONB,
  p_pagos         JSONB,
  p_usuario_id    UUID DEFAULT NULL,
  p_sesion_caja_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;
  RETURN public.process_sale_core(v_empresa, p_venta_id, p_lineas, p_pagos, p_usuario_id, p_sesion_caja_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID) TO authenticated;

-- ------------------------------------------------------------
-- registrar_venta_mp: el webhook (service_role) llama esto cuando MP aprueba el
-- pago. Lee el payload guardado en mp_cobros y registra la venta vía el núcleo,
-- con la empresa del cobro (NO del JWT). Idempotente (process_sale_core hace
-- early-return si la venta ya existe). Marca el cobro como aprobado.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_venta_mp(p_cobro_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cobro   public.mp_cobros%ROWTYPE;
  v_venta   UUID;
  v_sesion  UUID;
BEGIN
  SELECT * INTO v_cobro FROM public.mp_cobros WHERE id = p_cobro_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro MP inexistente' USING ERRCODE='P0002'; END IF;

  v_sesion := NULLIF(v_cobro.payload->>'sesion_caja_id', '')::UUID;

  v_venta := public.process_sale_core(
    v_cobro.empresa_id,
    v_cobro.venta_id,
    coalesce(v_cobro.payload->'lineas', '[]'::jsonb),
    coalesce(v_cobro.payload->'pagos',  '[]'::jsonb),
    NULL,
    v_sesion
  );

  UPDATE public.mp_cobros
  SET estado = 'approved', actualizado_en = now()
  WHERE id = p_cobro_id;

  RETURN v_venta;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_venta_mp(UUID) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venta_mp(UUID) TO service_role;
