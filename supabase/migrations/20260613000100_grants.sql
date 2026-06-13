-- ============================================================
-- mypyme — Grants de Data API (Fase 0)
-- "Automatically expose new tables" está OFF en el proyecto, así que los
-- privilegios de tabla para el rol `authenticated` se otorgan explícitamente.
-- RLS sigue filtrando las filas; esto solo abre el acceso a nivel de tabla.
-- NO se otorga nada a `anon`: estas tablas no son públicas.
-- ============================================================

-- empresas: lectura y edición (el INSERT inicial irá por un RPC SECURITY DEFINER en Fase 1).
GRANT SELECT, UPDATE ON public.empresas TO authenticated;

-- usuarios_empresa: el admin gestiona miembros (RLS restringe a su tenant + rol admin).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_empresa TO authenticated;

-- configuracion_negocio: lectura del tenant; escritura solo admin (RLS lo enforce).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_negocio TO authenticated;
