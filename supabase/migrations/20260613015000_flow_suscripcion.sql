-- ============================================================
-- mypyme — Suscripciones Flow.cl (Fase 6): columnas + trial
--
-- FUNDACIÓN segura: agrega el estado de suscripción que el webhook de Flow
-- actualizará más adelante. NO activa ningún bloqueo de acceso (el enforcement
-- queda detrás de env, ver lib/flow). `empresas.estado_suscripcion` ya existe
-- (default 'trial'); aquí sumamos los identificadores de Flow y la fecha de fin
-- de trial.
-- ============================================================

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS flow_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS flow_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_termina_en     TIMESTAMPTZ;

-- Backfill: 14 días de prueba desde la creación de cada empresa existente.
UPDATE public.empresas
SET trial_termina_en = creado_en + INTERVAL '14 days'
WHERE trial_termina_en IS NULL;

-- Lookup del webhook por el id de suscripción de Flow.
CREATE INDEX IF NOT EXISTS idx_empresas_flow_sub
  ON public.empresas (flow_subscription_id)
  WHERE flow_subscription_id IS NOT NULL;

-- ------------------------------------------------------------
-- Onboarding: setear el fin de trial (14 días) al crear la empresa.
-- (Resto idéntico al original; SECURITY DEFINER porque el usuario aún no tiene
--  empresa_id en el JWT.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.crear_empresa_y_membresia(
  p_rut          TEXT,
  p_razon_social TEXT,
  p_giro         TEXT DEFAULT NULL,
  p_telefono     TEXT DEFAULT NULL,
  p_direccion    TEXT DEFAULT NULL,
  p_usa_iva      BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_empresa_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios_empresa WHERE usuario_id = v_uid) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.empresas (rut, razon_social, giro, telefono, direccion, trial_termina_en)
  VALUES (p_rut, p_razon_social, p_giro, p_telefono, p_direccion, now() + INTERVAL '14 days')
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.usuarios_empresa (usuario_id, empresa_id, rol)
  VALUES (v_uid, v_empresa_id, 'admin');

  INSERT INTO public.configuracion_negocio (empresa_id, usa_iva)
  VALUES (v_empresa_id, p_usa_iva);

  RETURN v_empresa_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_empresa_y_membresia(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.crear_empresa_y_membresia(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) TO authenticated;
