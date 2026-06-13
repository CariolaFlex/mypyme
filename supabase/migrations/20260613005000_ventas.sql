-- ============================================================
-- mypyme — Ventas / POS (Fase 3A)
-- ventas + ventas_lineas + ventas_pagos. La caja (sesiones) es Fase 3B,
-- por eso sesion_caja_id queda nullable.
-- RPC process_sale: idempotente por UUID de cliente, precios autoritativos
-- desde la DB, descuento de stock atómico.
-- ============================================================

CREATE TABLE public.ventas (
  id              UUID PRIMARY KEY,                 -- generado en el cliente (idempotencia)
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sesion_caja_id  UUID,                             -- Fase 3B
  bodega_id       UUID REFERENCES public.bodegas(id),
  usuario_id      UUID REFERENCES auth.users(id),
  numero_boleta   TEXT,
  fecha_venta     TIMESTAMPTZ NOT NULL DEFAULT now(),
  monto_neto      NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_iva       NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total     NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_recibido  NUMERIC(14,2) NOT NULL DEFAULT 0,
  vuelto          NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado          TEXT NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada','cancelada')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ventas_lineas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id          UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id       UUID NOT NULL REFERENCES public.productos(id),
  cantidad          NUMERIC(14,3) NOT NULL,
  precio_neto_unit  NUMERIC(14,4) NOT NULL,
  precio_total_unit NUMERIC(14,4) NOT NULL,
  tasa_iva          NUMERIC(5,2) NOT NULL DEFAULT 0,
  monto_neto        NUMERIC(14,2) NOT NULL,
  monto_iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total       NUMERIC(14,2) NOT NULL,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ventas_pagos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  venta_id        UUID NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  metodo_pago_id  UUID NOT NULL REFERENCES public.metodos_pago(id),
  monto           NUMERIC(14,2) NOT NULL,
  monto_recibido  NUMERIC(14,2) NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ventas_empresa_fecha ON public.ventas (empresa_id, fecha_venta DESC);
CREATE INDEX idx_ventas_lineas_venta  ON public.ventas_lineas (empresa_id, venta_id);

-- RLS
ALTER TABLE public.ventas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_lineas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas_pagos   ENABLE ROW LEVEL SECURITY;

CREATE POLICY ventas_select ON public.ventas
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY ventas_insert ON public.ventas
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_tenant_id());
CREATE POLICY ventas_update ON public.ventas
  FOR UPDATE TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

CREATE POLICY vlineas_select ON public.ventas_lineas
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY vlineas_insert ON public.ventas_lineas
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_tenant_id());

CREATE POLICY vpagos_select ON public.ventas_pagos
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY vpagos_insert ON public.ventas_pagos
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_tenant_id());

GRANT SELECT, INSERT, UPDATE ON public.ventas        TO authenticated;
GRANT SELECT, INSERT         ON public.ventas_lineas TO authenticated;
GRANT SELECT, INSERT         ON public.ventas_pagos  TO authenticated;

-- ------------------------------------------------------------
-- RPC process_sale: registra una venta completa de forma idempotente.
--   p_lineas: [{"producto_id": uuid, "cantidad": number}]
--   p_pagos:  [{"metodo_pago_id": uuid, "monto": number}]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale(
  p_venta_id  UUID,
  p_lineas    JSONB,
  p_pagos     JSONB,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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
  rec         JSONB;
  prod        public.productos%ROWTYPE;
BEGIN
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE = '28000';
  END IF;

  -- Idempotencia: si ya existe esa venta, no reprocesar.
  IF EXISTS (SELECT 1 FROM public.ventas WHERE id = p_venta_id) THEN
    RETURN p_venta_id;
  END IF;

  SELECT id INTO v_bodega
  FROM public.bodegas
  WHERE empresa_id = v_empresa AND es_default
  LIMIT 1;

  INSERT INTO public.ventas (id, empresa_id, usuario_id, bodega_id, estado)
  VALUES (p_venta_id, v_empresa, p_usuario_id, v_bodega, 'completada')
  ON CONFLICT (id) DO NOTHING;

  -- Líneas
  FOR rec IN SELECT jsonb_array_elements(p_lineas) LOOP
    SELECT * INTO prod FROM public.productos
    WHERE id = (rec->>'producto_id')::UUID AND empresa_id = v_empresa;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto inválido para esta empresa' USING ERRCODE = 'P0002';
    END IF;

    v_qty := (rec->>'cantidad')::NUMERIC;
    v_lt  := coalesce(prod.precio_total, 0) * v_qty;
    v_ln  := CASE WHEN coalesce(prod.tasa_iva, 0) > 0
                  THEN round(v_lt / (1 + prod.tasa_iva / 100), 2) ELSE v_lt END;
    v_li  := v_lt - v_ln;

    INSERT INTO public.ventas_lineas (
      empresa_id, venta_id, producto_id, cantidad, precio_neto_unit,
      precio_total_unit, tasa_iva, monto_neto, monto_iva, monto_total)
    VALUES (
      v_empresa, p_venta_id, prod.id, v_qty, coalesce(prod.precio_neto, 0),
      coalesce(prod.precio_total, 0), coalesce(prod.tasa_iva, 0), v_ln, v_li, v_lt);

    v_total := v_total + v_lt;
    v_neto  := v_neto + v_ln;
    v_iva   := v_iva + v_li;

    IF prod.controla_stock THEN
      INSERT INTO public.movimientos_inventario (empresa_id, producto_id, bodega_id, cantidad, tipo)
      VALUES (v_empresa, prod.id, v_bodega, -v_qty, 'venta');
    END IF;
  END LOOP;

  -- Pagos
  FOR rec IN SELECT jsonb_array_elements(p_pagos) LOOP
    INSERT INTO public.ventas_pagos (empresa_id, venta_id, metodo_pago_id, monto, monto_recibido)
    VALUES (v_empresa, p_venta_id, (rec->>'metodo_pago_id')::UUID,
            (rec->>'monto')::NUMERIC, (rec->>'monto')::NUMERIC);
    v_recibido := v_recibido + (rec->>'monto')::NUMERIC;
  END LOOP;

  UPDATE public.ventas
  SET monto_neto = v_neto, monto_iva = v_iva, monto_total = v_total,
      monto_recibido = v_recibido, vuelto = greatest(v_recibido - v_total, 0)
  WHERE id = p_venta_id;

  RETURN p_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID) TO authenticated;
