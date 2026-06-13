-- ============================================================
-- mypyme — Migración core (Fase 0)
-- Tablas núcleo multi-tenant + funciones RLS + validación RUT + Auth Hook
-- ============================================================

-- ------------------------------------------------------------
-- 1. Validación de RUT chileno (Módulo 11)
--    Acepta formato '12345678-9' o '12345678-K' (con o sin guion/puntos).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_rut_chileno(rut TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  limpio    TEXT;
  cuerpo    TEXT;
  dv        TEXT;
  suma      INT := 0;
  factor    INT := 2;
  i         INT;
  resto     INT;
  dv_calc   TEXT;
BEGIN
  IF rut IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Quitar puntos, guiones y espacios; pasar a mayúscula (para la K)
  limpio := upper(regexp_replace(rut, '[^0-9kK]', '', 'g'));

  IF length(limpio) < 2 THEN
    RETURN FALSE;
  END IF;

  cuerpo := left(limpio, length(limpio) - 1);
  dv     := right(limpio, 1);

  IF cuerpo !~ '^[0-9]+$' THEN
    RETURN FALSE;
  END IF;

  -- Cálculo Módulo 11 recorriendo el cuerpo de derecha a izquierda
  FOR i IN REVERSE length(cuerpo)..1 LOOP
    suma := suma + (substr(cuerpo, i, 1))::INT * factor;
    factor := CASE WHEN factor = 7 THEN 2 ELSE factor + 1 END;
  END LOOP;

  resto := 11 - (suma % 11);
  dv_calc := CASE
    WHEN resto = 11 THEN '0'
    WHEN resto = 10 THEN 'K'
    ELSE resto::TEXT
  END;

  RETURN dv_calc = dv;
END;
$$;

-- ------------------------------------------------------------
-- 2. Enum de roles
-- ------------------------------------------------------------
CREATE TYPE public.rol_empresa AS ENUM ('admin', 'empleado');

-- ------------------------------------------------------------
-- 3. Tablas núcleo
-- ------------------------------------------------------------
CREATE TABLE public.empresas (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rut                VARCHAR(12) UNIQUE NOT NULL,
  razon_social       VARCHAR(255) NOT NULL,
  giro               VARCHAR(255),
  telefono           VARCHAR(20),
  direccion          TEXT,
  estado_suscripcion VARCHAR(50) NOT NULL DEFAULT 'trial',   -- trial, activa, morosa, suspendida, cancelada
  plan               VARCHAR(50) NOT NULL DEFAULT 'emprende', -- emprende, pyme
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_rut_valido CHECK (public.validar_rut_chileno(rut))
);

CREATE TABLE public.usuarios_empresa (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  rol         public.rol_empresa NOT NULL DEFAULT 'empleado',
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, empresa_id)
);

CREATE TABLE public.configuracion_negocio (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id        UUID NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  usa_iva           BOOLEAN NOT NULL DEFAULT true,
  tasa_iva_default  NUMERIC(5,2) NOT NULL DEFAULT 19.00,
  precios_con_iva   BOOLEAN NOT NULL DEFAULT true,
  moneda            VARCHAR(10) NOT NULL DEFAULT 'CLP',
  umbral_stock_bajo INTEGER NOT NULL DEFAULT 5,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_empresa_emp ON public.usuarios_empresa (empresa_id);
CREATE INDEX idx_usuarios_empresa_usr ON public.usuarios_empresa (usuario_id);

-- ------------------------------------------------------------
-- 4. Helpers de tenant (leen los custom claims del JWT)
--    STABLE para que el planificador las cachee por statement.
--    Regla de oro: NO consultan otras tablas (evita recursión RLS 42P17).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id',
    ''
  )::UUID;
$$;

CREATE OR REPLACE FUNCTION public.get_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'user_rol';
$$;

-- ------------------------------------------------------------
-- 5. Custom Access Token Hook — inyecta empresa_id y user_rol en el JWT
--    Se ejecuta como supabase_auth_admin al emitir el token.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims      JSONB;
  v_empresa   UUID;
  v_rol       TEXT;
BEGIN
  SELECT ue.empresa_id, ue.rol::TEXT
    INTO v_empresa, v_rol
  FROM public.usuarios_empresa ue
  WHERE ue.usuario_id = (event->>'user_id')::UUID
  ORDER BY ue.creado_en ASC
  LIMIT 1;

  claims := event->'claims';

  IF v_empresa IS NOT NULL THEN
    claims := jsonb_set(claims, '{empresa_id}', to_jsonb(v_empresa::TEXT));
    claims := jsonb_set(claims, '{user_rol}',   to_jsonb(v_rol));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Permisos del hook: solo supabase_auth_admin lo ejecuta.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated, anon, public;
-- El hook necesita leer usuarios_empresa para resolver el tenant.
GRANT SELECT ON public.usuarios_empresa TO supabase_auth_admin;

-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------
ALTER TABLE public.empresas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresa      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;

-- empresas: el usuario solo ve/edita SU empresa (la del claim).
CREATE POLICY empresas_select ON public.empresas
  FOR SELECT TO authenticated
  USING (id = public.get_tenant_id());

CREATE POLICY empresas_update ON public.empresas
  FOR UPDATE TO authenticated
  USING (id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- usuarios_empresa: visibles los del mismo tenant.
CREATE POLICY usuarios_empresa_select ON public.usuarios_empresa
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_tenant_id());

-- Solo admin gestiona miembros de su empresa.
CREATE POLICY usuarios_empresa_admin_write ON public.usuarios_empresa
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- configuracion_negocio: lectura del tenant; escritura solo admin.
CREATE POLICY config_select ON public.configuracion_negocio
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_tenant_id());

CREATE POLICY config_admin_write ON public.configuracion_negocio
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- NOTA (Fase 1): el alta inicial de empresa (onboarding) la hará un RPC
-- SECURITY DEFINER `crear_empresa_y_membresia(...)`, porque en ese momento el
-- usuario aún no tiene empresa_id en su JWT. No se abre INSERT directo a empresas.
