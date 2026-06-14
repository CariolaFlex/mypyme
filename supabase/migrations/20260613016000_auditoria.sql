-- ============================================================
-- mypyme — Bitácora de cambios (audit log) · Sprint 1A
--
-- Registra automáticamente TODO INSERT/UPDATE/DELETE sobre los datos maestros
-- de cada empresa, con actor + datos_antes/datos_después (JSON completo). Al ser
-- triggers en Postgres es imposible saltárselo (incluso un cambio directo en la
-- DB queda registrado). Protege contra cambios accidentales o malintencionados:
-- siempre se puede ver qué había antes y quién lo cambió.
--
-- Visible solo para admins del tenant (RLS). Append-only: nadie puede editar la
-- bitácora (solo el trigger DEFINER escribe; los usuarios solo tienen SELECT).
-- ============================================================

CREATE TABLE public.auditoria (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_id    UUID NOT NULL,
  tabla         TEXT NOT NULL,
  registro_id   TEXT,
  accion        TEXT NOT NULL CHECK (accion IN ('insert','update','delete')),
  actor_id      UUID,            -- auth.uid(); NULL = sistema (service_role / migración)
  actor_email   TEXT,
  datos_antes   JSONB,
  datos_despues JSONB,
  ocurrido_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_empresa   ON public.auditoria (empresa_id, ocurrido_en DESC);
CREATE INDEX idx_auditoria_registro  ON public.auditoria (empresa_id, tabla, registro_id);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Solo admins del tenant LEEN su bitácora. Nadie la escribe vía RLS (solo el trigger).
CREATE POLICY auditoria_select_admin ON public.auditoria
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

GRANT SELECT ON public.auditoria TO authenticated;

-- ------------------------------------------------------------
-- Trigger genérico. SECURITY DEFINER para poder insertar en auditoria
-- (que tiene RLS) sin importar el rol del que disparó el cambio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_auditar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old     JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new     JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_empresa UUID;
  v_id      TEXT;
  v_email   TEXT;
BEGIN
  -- empresa_id desde la fila; para la tabla `empresas` el id ES la empresa.
  v_empresa := COALESCE(
    (v_new ->> 'empresa_id')::UUID, (v_old ->> 'empresa_id')::UUID,
    (v_new ->> 'id')::UUID,         (v_old ->> 'id')::UUID
  );
  v_id  := COALESCE(v_new ->> 'id', v_old ->> 'id');
  v_email := NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'email', '');

  INSERT INTO public.auditoria
    (empresa_id, tabla, registro_id, accion, actor_id, actor_email, datos_antes, datos_despues)
  VALUES
    (v_empresa, TG_TABLE_NAME, v_id, lower(TG_OP), auth.uid(), v_email, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ------------------------------------------------------------
-- Adjuntar el trigger a los datos maestros mutables. (Los ledgers append-only
-- —ventas, movimientos_*, pagos— NO se auditan: ya son historia inmutable.)
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'empresas', 'configuracion_negocio', 'usuarios_empresa',
    'productos', 'categorias_producto', 'bodegas', 'metodos_pago',
    'proveedores', 'categorias_gasto', 'gastos',
    'ordenes_compra', 'ordenes_compra_lineas', 'facturas_proveedor'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auditar ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_auditar AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.fn_auditar()', t);
  END LOOP;
END $$;
