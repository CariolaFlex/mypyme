-- ============================================================
-- mypyme — Caja (Fase 3B)
-- cajas, sesiones_caja, movimientos_caja + RPCs abrir/cerrar.
-- process_sale ahora vincula la venta a la sesión y registra el efectivo
-- en el flujo de caja (para la cuadratura).
-- ============================================================

CREATE TABLE public.cajas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  activa      BOOLEAN NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE public.sesiones_caja (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  caja_id           UUID NOT NULL REFERENCES public.cajas(id) ON DELETE CASCADE,
  usuario_apertura  UUID REFERENCES auth.users(id),
  usuario_cierre    UUID REFERENCES auth.users(id),
  abierta_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrada_en        TIMESTAMPTZ,
  monto_apertura    NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_cierre      NUMERIC(14,2),     -- contado real
  monto_esperado    NUMERIC(14,2),     -- calculado
  estado            TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una sola sesión abierta por caja.
CREATE UNIQUE INDEX uniq_sesion_abierta
  ON public.sesiones_caja (caja_id) WHERE estado = 'abierta';

CREATE TABLE public.movimientos_caja (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sesion_caja_id  UUID NOT NULL REFERENCES public.sesiones_caja(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('venta','entrada_manual','salida_manual','gasto','pago_proveedor')),
  monto           NUMERIC(14,2) NOT NULL,   -- + entra, - sale
  venta_id        UUID,
  descripcion     TEXT,
  ocurrido_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mov_caja_sesion ON public.movimientos_caja (empresa_id, sesion_caja_id);

-- RLS
ALTER TABLE public.cajas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_caja    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY cajas_select ON public.cajas
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY cajas_admin_write ON public.cajas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

CREATE POLICY sesiones_select ON public.sesiones_caja
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY sesiones_insert ON public.sesiones_caja
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_tenant_id());
CREATE POLICY sesiones_update ON public.sesiones_caja
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

CREATE POLICY movcaja_select ON public.movimientos_caja
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY movcaja_insert ON public.movimientos_caja
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cajas            TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.sesiones_caja    TO authenticated;
GRANT SELECT, INSERT                 ON public.movimientos_caja TO authenticated;

-- ------------------------------------------------------------
-- RPC abrir_caja: abre una sesión en la primera caja activa del tenant.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abrir_caja(p_monto_apertura NUMERIC DEFAULT 0)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
  v_caja    UUID;
  v_sesion  UUID;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa' USING ERRCODE='28000'; END IF;

  SELECT id INTO v_caja FROM public.cajas
  WHERE empresa_id = v_empresa AND activa ORDER BY creado_en LIMIT 1;
  IF v_caja IS NULL THEN RAISE EXCEPTION 'No hay caja configurada' USING ERRCODE='P0002'; END IF;

  IF EXISTS (SELECT 1 FROM public.sesiones_caja WHERE caja_id = v_caja AND estado = 'abierta') THEN
    RAISE EXCEPTION 'Ya hay una sesión de caja abierta' USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.sesiones_caja (empresa_id, caja_id, usuario_apertura, monto_apertura)
  VALUES (v_empresa, v_caja, auth.uid(), coalesce(p_monto_apertura, 0))
  RETURNING id INTO v_sesion;

  RETURN v_sesion;
END;
$$;

-- ------------------------------------------------------------
-- RPC cerrar_caja: cierra la sesión y calcula la cuadratura.
-- Devuelve {esperado, contado, diferencia}.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cerrar_caja(p_sesion_id UUID, p_monto_contado NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_apertura NUMERIC;
  v_flujo    NUMERIC;
  v_esperado NUMERIC;
BEGIN
  SELECT monto_apertura INTO v_apertura FROM public.sesiones_caja
  WHERE id = p_sesion_id AND estado = 'abierta';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sesión no abierta' USING ERRCODE='P0002'; END IF;

  SELECT coalesce(sum(monto), 0) INTO v_flujo FROM public.movimientos_caja
  WHERE sesion_caja_id = p_sesion_id;

  v_esperado := v_apertura + v_flujo;

  UPDATE public.sesiones_caja
  SET estado = 'cerrada', cerrada_en = now(), usuario_cierre = auth.uid(),
      monto_cierre = p_monto_contado, monto_esperado = v_esperado
  WHERE id = p_sesion_id;

  RETURN jsonb_build_object(
    'esperado', v_esperado,
    'contado', p_monto_contado,
    'diferencia', p_monto_contado - v_esperado
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abrir_caja(NUMERIC) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cerrar_caja(UUID, NUMERIC) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.abrir_caja(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cerrar_caja(UUID, NUMERIC) TO authenticated;

-- ------------------------------------------------------------
-- process_sale v2: agrega p_sesion_caja_id y registra el efectivo en caja.
-- Soporta monto_recibido por pago (para vuelto en efectivo).
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.process_sale(UUID, JSONB, JSONB, UUID);

CREATE OR REPLACE FUNCTION public.process_sale(
  p_venta_id      UUID,
  p_lineas        JSONB,
  p_pagos         JSONB,
  p_usuario_id    UUID DEFAULT NULL,
  p_sesion_caja_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa   UUID := public.get_tenant_id();
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
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;

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

REVOKE EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID) TO authenticated;
