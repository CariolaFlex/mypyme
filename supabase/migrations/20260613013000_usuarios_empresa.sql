-- ============================================================
-- mypyme — Gestión de usuarios de la empresa (/configuracion/usuarios)
-- Listar miembros (con email), cambiar rol y quitar miembros.
--
-- El ALTA de empleados NO usa invitación por email (sin SMTP en dev): se hace
-- desde una server action con el service_role (admin.createUser), pensado para
-- una cafetería donde el dueño crea la cuenta y entrega la clave en persona.
--
-- listar_usuarios_empresa: SECURITY DEFINER (necesita leer auth.users para el
--   email; `authenticated` no tiene SELECT ahí). Aislamiento manual por
--   empresa_id = get_tenant_id() (DEFINER bypasea RLS; claim NULL → 0 filas).
-- cambiar_rol / quitar: SECURITY INVOKER → la RLS `usuarios_empresa_admin_write`
--   ya exige admin del tenant; agregamos guardas de negocio (último admin, etc.)
--   con errores claros.
-- ============================================================

-- ------------------------------------------------------------
-- Lista los miembros de la empresa del JWT, con su email y rol.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listar_usuarios_empresa()
RETURNS TABLE (
  usuario_id  UUID,
  email       TEXT,
  rol         TEXT,
  creado_en   TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ue.usuario_id, u.email, ue.rol::TEXT, ue.creado_en
  FROM public.usuarios_empresa ue
  JOIN auth.users u ON u.id = ue.usuario_id
  WHERE ue.empresa_id = public.get_tenant_id()
  ORDER BY ue.creado_en;
$$;

-- ------------------------------------------------------------
-- Cambia el rol de un miembro. Solo admin. No deja la empresa sin admin.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cambiar_rol_usuario_empresa(
  p_target UUID,
  p_rol    rol_empresa
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.get_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar roles';
  END IF;

  -- Si se va a degradar a alguien que es admin, exigir que quede otro admin.
  IF p_rol <> 'admin' THEN
    IF (SELECT count(*) FROM public.usuarios_empresa
        WHERE empresa_id = public.get_tenant_id()
          AND rol = 'admin'
          AND usuario_id <> p_target) = 0 THEN
      RAISE EXCEPTION 'Debe quedar al menos un administrador';
    END IF;
  END IF;

  UPDATE public.usuarios_empresa
  SET rol = p_rol
  WHERE empresa_id = public.get_tenant_id()
    AND usuario_id = p_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en la empresa';
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- Quita un miembro de la empresa (no borra su cuenta auth). Solo admin.
-- No permite auto-quitarse ni dejar la empresa sin admin.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quitar_usuario_empresa(
  p_target UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_rol_target TEXT;
BEGIN
  IF public.get_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede quitar usuarios';
  END IF;

  IF p_target = auth.uid() THEN
    RAISE EXCEPTION 'No puedes quitarte a ti mismo';
  END IF;

  SELECT rol::TEXT INTO v_rol_target
  FROM public.usuarios_empresa
  WHERE empresa_id = public.get_tenant_id() AND usuario_id = p_target;

  IF v_rol_target IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en la empresa';
  END IF;

  IF v_rol_target = 'admin'
     AND (SELECT count(*) FROM public.usuarios_empresa
          WHERE empresa_id = public.get_tenant_id()
            AND rol = 'admin'
            AND usuario_id <> p_target) = 0 THEN
    RAISE EXCEPTION 'Debe quedar al menos un administrador';
  END IF;

  DELETE FROM public.usuarios_empresa
  WHERE empresa_id = public.get_tenant_id() AND usuario_id = p_target;
END;
$$;

-- ------------------------------------------------------------
-- Grants: auto-expose OFF → execute explícito a authenticated, nunca a anon.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.listar_usuarios_empresa()                          FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cambiar_rol_usuario_empresa(UUID, rol_empresa)     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.quitar_usuario_empresa(UUID)                       FROM anon, public;

GRANT  EXECUTE ON FUNCTION public.listar_usuarios_empresa()                          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.cambiar_rol_usuario_empresa(UUID, rol_empresa)     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.quitar_usuario_empresa(UUID)                       TO authenticated;
