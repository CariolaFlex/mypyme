-- ============================================================
-- mypyme — Carga inicial de catálogo (Fase 7, beta)
-- Importa en UNA transacción una lista de productos (con categoría y stock
-- inicial opcionales) pegada por el dueño al hacer onboarding del local.
--
-- SECURITY INVOKER: la RLS hace cumplir que solo un admin del tenant escriba en
-- productos/categorias_producto; el movimiento de stock va por la policy de
-- inserción del tenant. Atómica: si una fila falla, no entra ninguna.
--
-- p_items: jsonb array de objetos:
--   { "nombre": text (req),
--     "precio_total": number (req, con IVA),
--     "categoria": text|null,
--     "stock": number|null }   -- si viene, el producto controla stock
--
-- Deriva precio_neto del IVA del negocio (configuracion_negocio). SKU se genera
-- a partir del nombre y se desambigua con un sufijo si colisiona.
-- ============================================================

CREATE OR REPLACE FUNCTION public.importar_catalogo(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_empresa   UUID := public.get_tenant_id();
  v_usa_iva   BOOLEAN;
  v_tasa      NUMERIC;
  v_bodega    UUID;
  it          JSONB;
  v_nombre    TEXT;
  v_total     NUMERIC;
  v_cat_nombre TEXT;
  v_cat_id    UUID;
  v_stock     NUMERIC;
  v_controla  BOOLEAN;
  v_tasa_prod NUMERIC;
  v_neto      NUMERIC;
  v_iva       NUMERIC;
  v_base_sku  TEXT;
  v_sku       TEXT;
  v_n         INT;
  v_prod_id   UUID;
  v_creados   INT := 0;
BEGIN
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Sin empresa en el contexto';
  END IF;
  IF public.get_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo un administrador puede importar el catálogo';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'No hay productos para importar';
  END IF;

  SELECT usa_iva, coalesce(tasa_iva_default, 19)
    INTO v_usa_iva, v_tasa
  FROM public.configuracion_negocio WHERE empresa_id = v_empresa;
  v_usa_iva := coalesce(v_usa_iva, true);
  v_tasa := coalesce(v_tasa, 19);

  SELECT id INTO v_bodega FROM public.bodegas
  WHERE empresa_id = v_empresa ORDER BY es_default DESC, creado_en ASC LIMIT 1;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_nombre := btrim(coalesce(it->>'nombre', ''));
    IF v_nombre = '' THEN
      RAISE EXCEPTION 'Cada producto necesita un nombre';
    END IF;

    v_total := (it->>'precio_total')::NUMERIC;
    IF v_total IS NULL OR v_total < 0 THEN
      RAISE EXCEPTION 'Precio inválido en "%"', v_nombre;
    END IF;

    -- Categoría (opcional): buscar o crear por nombre.
    v_cat_id := NULL;
    v_cat_nombre := btrim(coalesce(it->>'categoria', ''));
    IF v_cat_nombre <> '' THEN
      SELECT id INTO v_cat_id FROM public.categorias_producto
      WHERE empresa_id = v_empresa AND lower(nombre) = lower(v_cat_nombre) LIMIT 1;
      IF v_cat_id IS NULL THEN
        INSERT INTO public.categorias_producto (empresa_id, nombre)
        VALUES (v_empresa, v_cat_nombre) RETURNING id INTO v_cat_id;
      END IF;
    END IF;

    -- Stock inicial (opcional) → controla_stock si viene.
    v_controla := (it ? 'stock') AND (it->>'stock') IS NOT NULL AND btrim(it->>'stock') <> '';
    v_stock := CASE WHEN v_controla THEN (it->>'stock')::NUMERIC ELSE NULL END;

    -- Precios: el total es con IVA; derivar neto.
    v_tasa_prod := CASE WHEN v_usa_iva THEN v_tasa ELSE 0 END;
    v_neto := round(v_total / (1 + v_tasa_prod / 100), 2);
    v_iva  := v_total - v_neto;

    -- SKU: slug del nombre (alfa-num, máx 12) + sufijo si colisiona.
    v_base_sku := upper(regexp_replace(v_nombre, '[^a-zA-Z0-9]', '', 'g'));
    IF v_base_sku = '' THEN v_base_sku := 'PROD'; END IF;
    v_base_sku := left(v_base_sku, 12);
    v_sku := v_base_sku;
    v_n := 1;
    WHILE EXISTS (SELECT 1 FROM public.productos WHERE empresa_id = v_empresa AND sku = v_sku) LOOP
      v_n := v_n + 1;
      v_sku := left(v_base_sku, 9) || '-' || v_n;
    END LOOP;

    INSERT INTO public.productos (
      empresa_id, sku, nombre, categoria_id, controla_stock, activo,
      precio_neto, precio_total, tasa_iva
    ) VALUES (
      v_empresa, v_sku, v_nombre, v_cat_id, v_controla, true,
      v_neto, v_total, v_tasa_prod
    ) RETURNING id INTO v_prod_id;

    IF v_controla AND v_stock IS NOT NULL AND v_stock <> 0 AND v_bodega IS NOT NULL THEN
      INSERT INTO public.movimientos_inventario (empresa_id, producto_id, bodega_id, cantidad, tipo)
      VALUES (v_empresa, v_prod_id, v_bodega, v_stock, 'ajuste');
    END IF;

    v_creados := v_creados + 1;
  END LOOP;

  RETURN jsonb_build_object('creados', v_creados);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.importar_catalogo(JSONB) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.importar_catalogo(JSONB) TO authenticated;
