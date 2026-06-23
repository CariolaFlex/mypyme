-- Fix: aislar las columnas de token de mp_conexiones del rol authenticated.
-- En Postgres, un GRANT SELECT a nivel de TABLA habilita TODAS las columnas y un
-- REVOKE por columna NO lo recorta (privilegios de tabla y de columna son
-- independientes). La forma correcta es no dar SELECT de tabla y otorgar SELECT
-- solo de las columnas no-secretas. Los tokens los lee únicamente el service_role.
REVOKE SELECT ON public.mp_conexiones FROM authenticated;

GRANT SELECT (empresa_id, mp_user_id, expira_en, scope, estado, creado_en, actualizado_en)
  ON public.mp_conexiones TO authenticated;
