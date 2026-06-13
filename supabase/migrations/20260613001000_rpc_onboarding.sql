-- ============================================================
-- mypyme — RPC de onboarding (Fase 1)
-- Crea empresa + membresía (admin) + configuración en una transacción.
-- SECURITY DEFINER porque el usuario recién registrado aún NO tiene
-- empresa_id en su JWT, así que el RLS normal lo bloquearía.
-- MVP: 1 usuario = 1 empresa.
-- ============================================================
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

  -- 1 usuario = 1 empresa (MVP)
  IF EXISTS (SELECT 1 FROM public.usuarios_empresa WHERE usuario_id = v_uid) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa' USING ERRCODE = 'P0001';
  END IF;

  -- empresas.rut es UNIQUE + CHECK Módulo 11 → RUT inválido o duplicado falla aquí.
  INSERT INTO public.empresas (rut, razon_social, giro, telefono, direccion)
  VALUES (p_rut, p_razon_social, p_giro, p_telefono, p_direccion)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.usuarios_empresa (usuario_id, empresa_id, rol)
  VALUES (v_uid, v_empresa_id, 'admin');

  INSERT INTO public.configuracion_negocio (empresa_id, usa_iva)
  VALUES (v_empresa_id, p_usa_iva);

  RETURN v_empresa_id;
END;
$$;

-- Solo usuarios autenticados pueden ejecutarla.
REVOKE EXECUTE ON FUNCTION public.crear_empresa_y_membresia(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.crear_empresa_y_membresia(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) TO authenticated;
