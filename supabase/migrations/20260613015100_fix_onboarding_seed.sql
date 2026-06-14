-- ============================================================
-- mypyme — FIX: restaurar el sembrado del onboarding (regresión de 015000)
--
-- La migración 015000 recreó crear_empresa_y_membresia partiendo de la versión
-- ORIGINAL (001000) y, sin querer, descartó los seeds que 002100/006100/008100
-- le habían agregado (bodega, métodos de pago, caja, categorías de gasto).
-- Esta migración restaura la función COMPLETA: normalización de RUT + todos los
-- seeds + el trial de 14 días de Fase 6.
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

  -- Normalizar RUT a forma canónica sin puntos (76192083-9).
  v_limpio := upper(regexp_replace(coalesce(p_rut, ''), '[^0-9kK]', '', 'g'));
  IF length(v_limpio) >= 2 THEN
    v_rut := left(v_limpio, length(v_limpio) - 1) || '-' || right(v_limpio, 1);
  ELSE
    v_rut := v_limpio;
  END IF;

  INSERT INTO public.empresas (rut, razon_social, giro, telefono, direccion, trial_termina_en)
  VALUES (v_rut, p_razon_social, p_giro, p_telefono, p_direccion, now() + INTERVAL '14 days')
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

  -- Caja por defecto
  INSERT INTO public.cajas (empresa_id, nombre)
  VALUES (v_empresa_id, 'Caja 1');

  -- Categorías de gasto estándar
  INSERT INTO public.categorias_gasto (empresa_id, nombre) VALUES
    (v_empresa_id, 'Insumos'),
    (v_empresa_id, 'Arriendo'),
    (v_empresa_id, 'Servicios básicos'),
    (v_empresa_id, 'Sueldos'),
    (v_empresa_id, 'Otros');

  RETURN v_empresa_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.crear_empresa_y_membresia(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.crear_empresa_y_membresia(TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN) TO authenticated;
