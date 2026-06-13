-- ============================================================
-- mypyme — Política RLS para el Auth Hook (Fase 1, fix)
-- El custom_access_token_hook corre como `supabase_auth_admin` (SECURITY
-- INVOKER). usuarios_empresa tiene RLS, y sin una política que permita a ese
-- rol leer, el hook no encuentra la membresía y NO inyecta empresa_id/user_rol.
-- Patrón oficial de Supabase para hooks que leen tablas con RLS.
-- ============================================================
CREATE POLICY usuarios_empresa_auth_admin_read ON public.usuarios_empresa
  AS PERMISSIVE
  FOR SELECT
  TO supabase_auth_admin
  USING (true);
