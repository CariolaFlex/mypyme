-- ============================================================
-- mypyme — Compras Fase 4A: Proveedores + Gastos
-- proveedores, categorias_gasto, gastos. Patrón RLS: lectura del tenant,
-- escritura admin (igual que catálogo). Un gasto pagado en efectivo con caja
-- abierta descuenta la caja automáticamente (RPC registrar_gasto).
-- El IVA de los gastos alimenta el CRÉDITO fiscal del F29 (Fase 5).
-- ============================================================

-- ------------------------------------------------------------
-- Proveedores
-- ------------------------------------------------------------
CREATE TABLE public.proveedores (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  rut         TEXT,
  email       TEXT,
  telefono    TEXT,
  activo      BOOLEAN NOT NULL DEFAULT true,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

-- ------------------------------------------------------------
-- Categorías de gasto
-- ------------------------------------------------------------
CREATE TABLE public.categorias_gasto (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  parent_id   UUID REFERENCES public.categorias_gasto(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

-- ------------------------------------------------------------
-- Gastos
-- ------------------------------------------------------------
CREATE TABLE public.gastos (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id         UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria_gasto_id UUID NOT NULL REFERENCES public.categorias_gasto(id),
  proveedor_id       UUID REFERENCES public.proveedores(id),
  sesion_caja_id     UUID REFERENCES public.sesiones_caja(id),  -- set si se pagó de la caja
  descripcion        TEXT NOT NULL,
  fecha              DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Santiago')::date,
  monto_neto         NUMERIC(14,2) NOT NULL,
  monto_iva          NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_total        NUMERIC(14,2) NOT NULL,
  tasa_iva           NUMERIC(5,2) NOT NULL DEFAULT 0,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gastos_empresa_fecha ON public.gastos (empresa_id, fecha DESC);
CREATE INDEX idx_proveedores_empresa  ON public.proveedores (empresa_id, activo);

-- Vincular movimientos de caja a un gasto (cuando se paga en efectivo).
ALTER TABLE public.movimientos_caja
  ADD COLUMN IF NOT EXISTS gasto_id UUID REFERENCES public.gastos(id);

-- ------------------------------------------------------------
-- RLS: lectura tenant, escritura admin (patrón catálogo)
-- ------------------------------------------------------------
ALTER TABLE public.proveedores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos           ENABLE ROW LEVEL SECURITY;

CREATE POLICY proveedores_select ON public.proveedores
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY proveedores_admin ON public.proveedores
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

CREATE POLICY catgasto_select ON public.categorias_gasto
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY catgasto_admin ON public.categorias_gasto
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

CREATE POLICY gastos_select ON public.gastos
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY gastos_admin ON public.gastos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proveedores      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_gasto TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos           TO authenticated;

-- ------------------------------------------------------------
-- Seed de categorías de gasto estándar para empresas existentes.
-- (Para empresas nuevas lo siembra el RPC de onboarding, abajo.)
-- ------------------------------------------------------------
INSERT INTO public.categorias_gasto (empresa_id, nombre)
SELECT e.id, c.nombre
FROM public.empresas e
CROSS JOIN (VALUES ('Insumos'), ('Arriendo'), ('Servicios básicos'), ('Sueldos'), ('Otros')) AS c(nombre)
ON CONFLICT (empresa_id, nombre) DO NOTHING;

-- ------------------------------------------------------------
-- RPC registrar_gasto: inserta el gasto y, si se paga en efectivo con caja
-- abierta, registra la salida en movimientos_caja (atómico). Deriva neto/IVA
-- desde el total y la tasa.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_gasto(
  p_categoria_gasto_id UUID,
  p_descripcion        TEXT,
  p_monto_total        NUMERIC,
  p_tasa_iva           NUMERIC DEFAULT 0,
  p_proveedor_id       UUID DEFAULT NULL,
  p_fecha              DATE DEFAULT NULL,
  p_pagar_efectivo     BOOLEAN DEFAULT false,
  p_sesion_caja_id     UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
  v_neto    NUMERIC;
  v_iva     NUMERIC;
  v_sesion  UUID;
  v_gasto   UUID;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;
  IF coalesce(p_monto_total, 0) <= 0 THEN RAISE EXCEPTION 'Monto inválido' USING ERRCODE='P0001'; END IF;

  v_neto := CASE WHEN coalesce(p_tasa_iva,0) > 0
                 THEN round(p_monto_total / (1 + p_tasa_iva/100), 2) ELSE p_monto_total END;
  v_iva  := p_monto_total - v_neto;

  -- Solo enlaza la sesión si efectivamente se paga de la caja.
  v_sesion := CASE WHEN p_pagar_efectivo THEN p_sesion_caja_id ELSE NULL END;

  INSERT INTO public.gastos (
    empresa_id, categoria_gasto_id, proveedor_id, sesion_caja_id, descripcion,
    fecha, monto_neto, monto_iva, monto_total, tasa_iva)
  VALUES (
    v_empresa, p_categoria_gasto_id, p_proveedor_id, v_sesion, p_descripcion,
    coalesce(p_fecha, (now() AT TIME ZONE 'America/Santiago')::date),
    v_neto, v_iva, p_monto_total, coalesce(p_tasa_iva, 0))
  RETURNING id INTO v_gasto;

  IF p_pagar_efectivo AND p_sesion_caja_id IS NOT NULL THEN
    INSERT INTO public.movimientos_caja (empresa_id, sesion_caja_id, tipo, monto, gasto_id, descripcion)
    VALUES (v_empresa, p_sesion_caja_id, 'gasto', -p_monto_total, v_gasto, p_descripcion);
  END IF;

  RETURN v_gasto;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_gasto(UUID,TEXT,NUMERIC,NUMERIC,UUID,DATE,BOOLEAN,UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.registrar_gasto(UUID,TEXT,NUMERIC,NUMERIC,UUID,DATE,BOOLEAN,UUID) TO authenticated;
