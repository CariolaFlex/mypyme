-- ============================================================
-- mypyme — Grants para service_role (Fase 0)
-- Con "auto-expose new tables" OFF, ni service_role recibe grants en tablas
-- nuevas. service_role se usa solo en backend (bypasea RLS) y debe tener
-- acceso completo. Se otorga en las tablas existentes y por defecto en futuras.
-- ============================================================

GRANT ALL ON public.empresas              TO service_role;
GRANT ALL ON public.usuarios_empresa      TO service_role;
GRANT ALL ON public.configuracion_negocio TO service_role;

-- Tablas futuras (Fase 2+) creadas por `postgres`: service_role hereda acceso.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
