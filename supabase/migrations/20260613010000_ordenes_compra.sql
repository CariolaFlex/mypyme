-- ============================================================
-- mypyme — Compras Fase 4B: Órdenes de compra + recepción
-- ordenes_compra + ordenes_compra_lineas. Flujo:
--   borrador → aprobada → recibida_parcial → recibida   (o cancelada)
-- Al recibir, genera movimientos_inventario tipo 'compra' (entrada de stock)
-- con el costo de la línea. RLS: lectura tenant / escritura admin.
-- ============================================================

CREATE TABLE public.ordenes_compra (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proveedor_id   UUID NOT NULL REFERENCES public.proveedores(id),
  bodega_id      UUID REFERENCES public.bodegas(id),
  usuario_id     UUID REFERENCES auth.users(id),
  fecha          DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Santiago')::date,
  fecha_esperada DATE,
  monto_neto     NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_iva      NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total    NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado         TEXT NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador','aprobada','recibida_parcial','recibida','cancelada')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ordenes_compra_lineas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden_compra_id   UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
  producto_id       UUID NOT NULL REFERENCES public.productos(id),
  cantidad          NUMERIC(14,3) NOT NULL,
  costo_neto_unit   NUMERIC(14,4) NOT NULL,
  tasa_iva          NUMERIC(5,2) NOT NULL DEFAULT 0,
  monto_neto        NUMERIC(14,2) NOT NULL,
  monto_iva         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total       NUMERIC(14,2) NOT NULL,
  cantidad_recibida NUMERIC(14,3) NOT NULL DEFAULT 0,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oc_empresa_estado ON public.ordenes_compra (empresa_id, estado);
CREATE INDEX idx_oc_lineas_oc      ON public.ordenes_compra_lineas (empresa_id, orden_compra_id);

-- Trazabilidad: qué recepción (movimiento de inventario) llenó qué línea de OC.
ALTER TABLE public.movimientos_inventario
  ADD COLUMN IF NOT EXISTS orden_compra_linea_id UUID REFERENCES public.ordenes_compra_lineas(id);

-- RLS
ALTER TABLE public.ordenes_compra        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenes_compra_lineas ENABLE ROW LEVEL SECURITY;

CREATE POLICY oc_select ON public.ordenes_compra
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY oc_admin ON public.ordenes_compra
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

CREATE POLICY ocl_select ON public.ordenes_compra_lineas
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY ocl_admin ON public.ordenes_compra_lineas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordenes_compra        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordenes_compra_lineas TO authenticated;

-- ------------------------------------------------------------
-- RPC crear_orden_compra: crea la OC (borrador) + sus líneas, deriva totales.
--   p_lineas: [{producto_id, cantidad, costo_neto_unit, tasa_iva}]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_orden_compra(
  p_proveedor_id   UUID,
  p_lineas         JSONB,
  p_fecha_esperada DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
  v_bodega  UUID;
  v_oc      UUID;
  v_neto    NUMERIC := 0;
  v_iva     NUMERIC := 0;
  v_total   NUMERIC := 0;
  v_ln      NUMERIC;
  v_li      NUMERIC;
  v_lt      NUMERIC;
  v_qty     NUMERIC;
  v_costo   NUMERIC;
  v_tasa    NUMERIC;
  rec       JSONB;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;
  IF jsonb_array_length(coalesce(p_lineas, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'La orden necesita al menos una línea' USING ERRCODE='P0001';
  END IF;

  SELECT id INTO v_bodega FROM public.bodegas WHERE empresa_id = v_empresa AND es_default LIMIT 1;

  INSERT INTO public.ordenes_compra (empresa_id, proveedor_id, bodega_id, usuario_id, fecha_esperada)
  VALUES (v_empresa, p_proveedor_id, v_bodega, auth.uid(), p_fecha_esperada)
  RETURNING id INTO v_oc;

  FOR rec IN SELECT jsonb_array_elements(p_lineas) LOOP
    v_qty   := (rec->>'cantidad')::NUMERIC;
    v_costo := (rec->>'costo_neto_unit')::NUMERIC;
    v_tasa  := coalesce((rec->>'tasa_iva')::NUMERIC, 0);
    IF v_qty <= 0 OR v_costo < 0 THEN
      RAISE EXCEPTION 'Cantidad o costo inválido' USING ERRCODE='P0001';
    END IF;

    v_ln := round(v_costo * v_qty, 2);
    v_li := round(v_ln * v_tasa / 100, 2);
    v_lt := v_ln + v_li;

    INSERT INTO public.ordenes_compra_lineas (
      empresa_id, orden_compra_id, producto_id, cantidad, costo_neto_unit, tasa_iva,
      monto_neto, monto_iva, monto_total)
    VALUES (
      v_empresa, v_oc, (rec->>'producto_id')::UUID, v_qty, v_costo, v_tasa,
      v_ln, v_li, v_lt);

    v_neto := v_neto + v_ln; v_iva := v_iva + v_li; v_total := v_total + v_lt;
  END LOOP;

  UPDATE public.ordenes_compra
  SET monto_neto = v_neto, monto_iva = v_iva, monto_total = v_total
  WHERE id = v_oc;

  RETURN v_oc;
END;
$$;

-- ------------------------------------------------------------
-- RPC aprobar_orden_compra: borrador → aprobada.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aprobar_orden_compra(p_oc_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  UPDATE public.ordenes_compra SET estado = 'aprobada'
  WHERE id = p_oc_id AND estado = 'borrador';
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden no está en borrador' USING ERRCODE='P0002'; END IF;
END;
$$;

-- ------------------------------------------------------------
-- RPC cancelar_orden_compra: cancela si no tiene recepciones.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancelar_orden_compra(p_oc_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ordenes_compra_lineas
             WHERE orden_compra_id = p_oc_id AND cantidad_recibida > 0) THEN
    RAISE EXCEPTION 'No se puede cancelar: ya tiene recepciones' USING ERRCODE='P0001';
  END IF;
  UPDATE public.ordenes_compra SET estado = 'cancelada'
  WHERE id = p_oc_id AND estado IN ('borrador','aprobada');
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden no se puede cancelar' USING ERRCODE='P0002'; END IF;
END;
$$;

-- ------------------------------------------------------------
-- RPC recibir_orden_compra: recibe cantidades (parcial o total).
--   p_recepciones: [{linea_id, cantidad}]
-- Genera movimientos_inventario 'compra' y recalcula el estado de la OC.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recibir_orden_compra(
  p_oc_id        UUID,
  p_recepciones  JSONB
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa  UUID := public.get_tenant_id();
  v_bodega   UUID;
  v_estado   TEXT;
  v_qty      NUMERIC;
  v_pend     NUMERIC;
  v_nuevo    TEXT;
  v_total_l  INT;
  v_recib_l  INT;
  rec        JSONB;
  lin        public.ordenes_compra_lineas%ROWTYPE;
BEGIN
  SELECT estado, bodega_id INTO v_estado, v_bodega FROM public.ordenes_compra
  WHERE id = p_oc_id AND empresa_id = v_empresa;
  IF NOT FOUND THEN RAISE EXCEPTION 'Orden no encontrada' USING ERRCODE='P0002'; END IF;
  IF v_estado NOT IN ('aprobada','recibida_parcial') THEN
    RAISE EXCEPTION 'La orden debe estar aprobada para recibir' USING ERRCODE='P0001';
  END IF;

  FOR rec IN SELECT jsonb_array_elements(p_recepciones) LOOP
    v_qty := (rec->>'cantidad')::NUMERIC;
    CONTINUE WHEN v_qty IS NULL OR v_qty <= 0;

    SELECT * INTO lin FROM public.ordenes_compra_lineas
    WHERE id = (rec->>'linea_id')::UUID AND orden_compra_id = p_oc_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Línea inválida' USING ERRCODE='P0002'; END IF;

    v_pend := lin.cantidad - lin.cantidad_recibida;
    IF v_qty > v_pend THEN
      RAISE EXCEPTION 'Cantidad recibida supera lo pendiente' USING ERRCODE='P0001';
    END IF;

    INSERT INTO public.movimientos_inventario (
      empresa_id, producto_id, bodega_id, cantidad, costo_unitario, tipo,
      orden_compra_linea_id, nota)
    VALUES (
      v_empresa, lin.producto_id, v_bodega, v_qty, lin.costo_neto_unit, 'compra',
      lin.id, 'Recepción OC');

    UPDATE public.ordenes_compra_lineas
    SET cantidad_recibida = cantidad_recibida + v_qty
    WHERE id = lin.id;
  END LOOP;

  -- Recalcular estado: todas las líneas completas → recibida; alguna parcial → recibida_parcial.
  SELECT count(*), count(*) FILTER (WHERE cantidad_recibida >= cantidad)
  INTO v_total_l, v_recib_l
  FROM public.ordenes_compra_lineas WHERE orden_compra_id = p_oc_id;

  v_nuevo := CASE WHEN v_recib_l = v_total_l THEN 'recibida' ELSE 'recibida_parcial' END;
  UPDATE public.ordenes_compra SET estado = v_nuevo WHERE id = p_oc_id;

  RETURN v_nuevo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_orden_compra(UUID,JSONB,DATE)   FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.aprobar_orden_compra(UUID)            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cancelar_orden_compra(UUID)           FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recibir_orden_compra(UUID,JSONB)      FROM anon, public;
GRANT EXECUTE ON FUNCTION public.crear_orden_compra(UUID,JSONB,DATE)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprobar_orden_compra(UUID)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_orden_compra(UUID)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.recibir_orden_compra(UUID,JSONB)       TO authenticated;
