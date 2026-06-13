-- ============================================================
-- mypyme — Compras Fase 4C: Cuentas por pagar
-- facturas_proveedor + pagos_proveedor. Cierra el ciclo OC → factura → pago.
-- Estados factura: pendiente → pago_parcial → pagada (o cancelada).
-- Un pago en efectivo con caja abierta descuenta la caja (atómico).
-- RLS: lectura tenant / escritura admin.
-- ============================================================

CREATE TABLE public.facturas_proveedor (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  proveedor_id    UUID NOT NULL REFERENCES public.proveedores(id),
  orden_compra_id UUID REFERENCES public.ordenes_compra(id),
  numero_factura  TEXT NOT NULL,
  fecha           DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Santiago')::date,
  vencimiento     DATE,
  monto_neto      NUMERIC(14,2) NOT NULL,
  monto_iva       NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total     NUMERIC(14,2) NOT NULL,
  saldo           NUMERIC(14,2) NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','pago_parcial','pagada','cancelada')),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, proveedor_id, numero_factura)
);

CREATE TABLE public.pagos_proveedor (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  factura_id      UUID NOT NULL REFERENCES public.facturas_proveedor(id) ON DELETE CASCADE,
  metodo_pago_id  UUID REFERENCES public.metodos_pago(id),
  sesion_caja_id  UUID REFERENCES public.sesiones_caja(id),
  fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
  monto           NUMERIC(14,2) NOT NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fact_prov_empresa_estado ON public.facturas_proveedor (empresa_id, estado);
CREATE INDEX idx_pagos_prov_factura       ON public.pagos_proveedor (empresa_id, factura_id);

-- Vincular el movimiento de caja al pago a proveedor (cuando se paga en efectivo).
ALTER TABLE public.movimientos_caja
  ADD COLUMN IF NOT EXISTS pago_proveedor_id UUID REFERENCES public.pagos_proveedor(id);

-- RLS
ALTER TABLE public.facturas_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_proveedor    ENABLE ROW LEVEL SECURITY;

CREATE POLICY fact_select ON public.facturas_proveedor
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY fact_admin ON public.facturas_proveedor
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

CREATE POLICY pagoprov_select ON public.pagos_proveedor
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY pagoprov_admin ON public.pagos_proveedor
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturas_proveedor TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagos_proveedor    TO authenticated;

-- ------------------------------------------------------------
-- RPC crear_factura_proveedor: deriva neto/IVA del total y deja saldo = total.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_factura_proveedor(
  p_proveedor_id    UUID,
  p_numero_factura  TEXT,
  p_monto_total     NUMERIC,
  p_tasa_iva        NUMERIC DEFAULT 0,
  p_orden_compra_id UUID DEFAULT NULL,
  p_fecha           DATE DEFAULT NULL,
  p_vencimiento     DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
  v_neto    NUMERIC;
  v_iva     NUMERIC;
  v_id      UUID;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;
  IF coalesce(p_monto_total,0) <= 0 THEN RAISE EXCEPTION 'Monto inválido' USING ERRCODE='P0001'; END IF;

  v_neto := CASE WHEN coalesce(p_tasa_iva,0) > 0
                 THEN round(p_monto_total / (1 + p_tasa_iva/100), 2) ELSE p_monto_total END;
  v_iva  := p_monto_total - v_neto;

  INSERT INTO public.facturas_proveedor (
    empresa_id, proveedor_id, orden_compra_id, numero_factura, fecha, vencimiento,
    monto_neto, monto_iva, monto_total, saldo)
  VALUES (
    v_empresa, p_proveedor_id, p_orden_compra_id, p_numero_factura,
    coalesce(p_fecha, (now() AT TIME ZONE 'America/Santiago')::date), p_vencimiento,
    v_neto, v_iva, p_monto_total, p_monto_total)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------
-- RPC registrar_pago_proveedor: abona a una factura, recalcula saldo/estado y,
-- si se paga en efectivo con caja abierta, descuenta la caja (atómico).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_pago_proveedor(
  p_factura_id     UUID,
  p_monto          NUMERIC,
  p_metodo_pago_id UUID DEFAULT NULL,
  p_pagar_efectivo BOOLEAN DEFAULT false,
  p_sesion_caja_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
  v_saldo   NUMERIC;
  v_estado  TEXT;
  v_sesion  UUID;
  v_nuevo   NUMERIC;
  v_pago    UUID;
BEGIN
  IF coalesce(p_monto,0) <= 0 THEN RAISE EXCEPTION 'Monto inválido' USING ERRCODE='P0001'; END IF;

  SELECT saldo, estado INTO v_saldo, v_estado FROM public.facturas_proveedor
  WHERE id = p_factura_id AND empresa_id = v_empresa;
  IF NOT FOUND THEN RAISE EXCEPTION 'Factura no encontrada' USING ERRCODE='P0002'; END IF;
  IF v_estado IN ('pagada','cancelada') THEN
    RAISE EXCEPTION 'La factura ya está % ', v_estado USING ERRCODE='P0001';
  END IF;
  IF p_monto > v_saldo THEN
    RAISE EXCEPTION 'El pago supera el saldo pendiente' USING ERRCODE='P0001';
  END IF;

  v_sesion := CASE WHEN p_pagar_efectivo THEN p_sesion_caja_id ELSE NULL END;

  INSERT INTO public.pagos_proveedor (empresa_id, factura_id, metodo_pago_id, sesion_caja_id, monto)
  VALUES (v_empresa, p_factura_id, p_metodo_pago_id, v_sesion, p_monto)
  RETURNING id INTO v_pago;

  v_nuevo := v_saldo - p_monto;
  UPDATE public.facturas_proveedor
  SET saldo = v_nuevo,
      estado = CASE WHEN v_nuevo <= 0 THEN 'pagada' ELSE 'pago_parcial' END
  WHERE id = p_factura_id;

  IF p_pagar_efectivo AND p_sesion_caja_id IS NOT NULL THEN
    INSERT INTO public.movimientos_caja (empresa_id, sesion_caja_id, tipo, monto, pago_proveedor_id, descripcion)
    VALUES (v_empresa, p_sesion_caja_id, 'pago_proveedor', -p_monto, v_pago, 'Pago a proveedor');
  END IF;

  RETURN v_pago;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_factura_proveedor(UUID,TEXT,NUMERIC,NUMERIC,UUID,DATE,DATE) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.registrar_pago_proveedor(UUID,NUMERIC,UUID,BOOLEAN,UUID)          FROM anon, public;
GRANT EXECUTE ON FUNCTION public.crear_factura_proveedor(UUID,TEXT,NUMERIC,NUMERIC,UUID,DATE,DATE)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pago_proveedor(UUID,NUMERIC,UUID,BOOLEAN,UUID)           TO authenticated;
