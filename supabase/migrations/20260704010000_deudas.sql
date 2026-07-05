-- ============================================================
-- mypyme — Deudas: registro universal de deudas por cobrar y por pagar
--
-- Cubre todas las variantes que maneja un micro-comercio:
--   por_cobrar → fiado de clientes, préstamos a empleados, etc.
--   por_pagar  → deudas personales del dueño, a proveedores (informales,
--                fuera de Cuentas por pagar), servicios, gastos generales.
-- Cada deuda lleva su saldo vivo y un historial de abonos. El abono es
-- atómico vía RPC (bloquea la fila, valida el saldo, actualiza estado).
--
-- Es DATO OPERATIVO → escritura de cualquier miembro del tenant (mismo
-- modelo que gastos/proveedores tras 20260613017000_roles_escritura).
-- NOTA: las facturas de proveedor formales siguen en facturas_proveedor
-- (Cuentas por pagar); esto NO las reemplaza, cubre lo informal.
-- ============================================================

CREATE TABLE public.deudas (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo              VARCHAR(12) NOT NULL CHECK (tipo IN ('por_cobrar', 'por_pagar')),
  categoria         VARCHAR(20) NOT NULL DEFAULT 'otro'
                    CHECK (categoria IN ('cliente', 'empleado', 'personal', 'proveedor', 'servicio', 'otro')),
  -- Nombre libre de quién debe / a quién se le debe (no hay tabla clientes;
  -- si algún día existe, se agrega un FK opcional sin romper esto).
  contraparte       TEXT NOT NULL,
  proveedor_id      UUID REFERENCES public.proveedores(id),
  descripcion       TEXT,
  monto_total       NUMERIC(14,2) NOT NULL CHECK (monto_total > 0),
  saldo             NUMERIC(14,2) NOT NULL CHECK (saldo >= 0),
  fecha             DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Santiago')::date,
  fecha_vencimiento DATE,
  estado            VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
  usuario_id        UUID REFERENCES auth.users(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.abonos_deuda (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  deuda_id    UUID NOT NULL REFERENCES public.deudas(id) ON DELETE CASCADE,
  monto       NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha       DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Santiago')::date,
  nota        TEXT,
  usuario_id  UUID REFERENCES auth.users(id),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deudas_empresa_estado ON public.deudas (empresa_id, estado, tipo);
CREATE INDEX idx_abonos_deuda          ON public.abonos_deuda (empresa_id, deuda_id);

-- ------------------------------------------------------------
-- RLS: lectura tenant, escritura tenant (dato operativo)
-- ------------------------------------------------------------
ALTER TABLE public.deudas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abonos_deuda ENABLE ROW LEVEL SECURITY;

CREATE POLICY deudas_select ON public.deudas
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY deudas_write ON public.deudas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

CREATE POLICY abonos_select ON public.abonos_deuda
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY abonos_write ON public.abonos_deuda
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deudas       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.abonos_deuda TO authenticated;

-- ------------------------------------------------------------
-- RPC abonar_deuda: inserta el abono y descuenta el saldo en una transacción
-- (FOR UPDATE evita que dos abonos simultáneos dejen el saldo negativo).
-- Con saldo en 0 la deuda pasa a 'pagada' automáticamente.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abonar_deuda(
  p_deuda_id UUID,
  p_monto    NUMERIC,
  p_nota     TEXT DEFAULT NULL,
  p_fecha    DATE DEFAULT NULL
)
RETURNS NUMERIC  -- saldo restante
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
  v_saldo   NUMERIC;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;
  IF coalesce(p_monto, 0) <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a 0' USING ERRCODE='P0001'; END IF;

  SELECT saldo INTO v_saldo FROM public.deudas
  WHERE id = p_deuda_id AND empresa_id = v_empresa
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deuda no encontrada' USING ERRCODE='P0001'; END IF;
  IF p_monto > v_saldo THEN
    RAISE EXCEPTION 'El abono (%) supera el saldo pendiente (%)', p_monto, v_saldo USING ERRCODE='P0001';
  END IF;

  INSERT INTO public.abonos_deuda (empresa_id, deuda_id, monto, fecha, nota, usuario_id)
  VALUES (v_empresa, p_deuda_id, p_monto,
          coalesce(p_fecha, (now() AT TIME ZONE 'America/Santiago')::date),
          nullif(trim(p_nota), ''), auth.uid());

  v_saldo := v_saldo - p_monto;
  UPDATE public.deudas
  SET saldo = v_saldo,
      estado = CASE WHEN v_saldo = 0 THEN 'pagada' ELSE 'pendiente' END,
      actualizado_en = now()
  WHERE id = p_deuda_id;

  RETURN v_saldo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.abonar_deuda(UUID,NUMERIC,TEXT,DATE) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.abonar_deuda(UUID,NUMERIC,TEXT,DATE) TO authenticated;
