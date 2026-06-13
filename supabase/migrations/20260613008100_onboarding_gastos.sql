-- ============================================================
-- mypyme — Onboarding siembra categorías de gasto estándar (Fase 4A)
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
  v_limpio     TEXT;
  v_rut        TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '28000';
  END IF;

  IF EXISTS (SELECT 1 FROM public.usuarios_empresa WHERE usuario_id = v_uid) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa' USING ERRCODE = 'P0001';
  END IF;

  v_limpio := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
  IF length(v_limpio) >= 2 THEN
    v_rut := left(v_limpio, length(v_limpio) - 1) || '-' || right(v_limpio, 1);
  ELSE
    v_rut := v_limpio;
  END IF;

  INSERT INTO public.empresas (rut, razon_social, giro, telefono, direccion)
  VALUES (v_rut, p_razon_social, p_giro, p_telefono, p_direccion)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.usuarios_empresa (usuario_id, empresa_id, rol)
  VALUES (v_uid, v_empresa_id, 'admin');

  INSERT INTO public.configuracion_negocio (empresa_id, usa_iva)
  VALUES (v_empresa_id, p_usa_iva);

  INSERT INTO public.bodegas (empresa_id, nombre, es_default)
  VALUES (v_empresa_id, 'Principal', true);

  INSERT INTO public.metodos_pago (empresa_id, nombre, tipo) VALUES
    (v_empresa_id, 'Efectivo',      'cash'),
    (v_empresa_id, 'Débito',        'card'),
    (v_empresa_id, 'Crédito',       'card'),
    (v_empresa_id, 'Transferencia', 'transfer');

  INSERT INTO public.cajas (empresa_id, nombre)
  VALUES (v_empresa_id, 'Caja 1');

  INSERT INTO public.categorias_gasto (empresa_id, nombre) VALUES
    (v_empresa_id, 'Insumos'),
    (v_empresa_id, 'Arriendo'),
    (v_empresa_id, 'Servicios básicos'),
    (v_empresa_id, 'Sueldos'),
    (v_empresa_id, 'Otros');

  RETURN v_empresa_id;
END;
$$;
