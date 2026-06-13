-- ============================================================
-- mypyme — Onboarding con seed de catálogo base (Fase 2 bloque A)
-- Cada empresa nueva nace con una bodega "Principal" y métodos de pago
-- estándar (Efectivo, Débito, Crédito, Transferencia).
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

  IF EXISTS (SELECT 1 FROM public.usuarios_empresa WHERE usuario_id = v_uid) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.empresas (rut, razon_social, giro, telefono, direccion)
  VALUES (p_rut, p_razon_social, p_giro, p_telefono, p_direccion)
  RETURNING id INTO v_empresa_id;

  INSERT INTO public.usuarios_empresa (usuario_id, empresa_id, rol)
  VALUES (v_uid, v_empresa_id, 'admin');

  INSERT INTO public.configuracion_negocio (empresa_id, usa_iva)
  VALUES (v_empresa_id, p_usa_iva);

  -- Bodega por defecto
  INSERT INTO public.bodegas (empresa_id, nombre, es_default)
  VALUES (v_empresa_id, 'Principal', true);

  -- Métodos de pago estándar
  INSERT INTO public.metodos_pago (empresa_id, nombre, tipo) VALUES
    (v_empresa_id, 'Efectivo',      'cash'),
    (v_empresa_id, 'Débito',        'card'),
    (v_empresa_id, 'Crédito',       'card'),
    (v_empresa_id, 'Transferencia', 'transfer');

  RETURN v_empresa_id;
END;
$$;
