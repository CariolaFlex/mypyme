-- ============================================================
-- POS: descuento total + nota/cliente en la venta
--   ... y CORRECCIÓN de arquitectura de process_sale.
--
-- Contexto: la migración de Mercado Pago (20260622) refactorizó process_sale en
-- un wrapper DEFINER que delega en process_sale_core (usado también por el
-- webhook MP vía registrar_venta_mp). La migración de servicios (20260705010000)
-- inline-ó la lógica de vuelta en process_sale (INVOKER) y dejó el core viejo sin
-- soporte de líneas libres. Esta migración restaura el patrón wrapper/core y deja
-- TODA la lógica (líneas de catálogo + líneas libres + descuento + nota) en el
-- núcleo, para que el POS directo y el camino MP se comporten idéntico.
--
-- Descuento: se aplica al total y se reparte proporcionalmente sobre neto e IVA
-- (así el F29 queda correcto; los reportes suman desde la cabecera `ventas`).
-- ============================================================

ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS descuento NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.ventas ADD COLUMN IF NOT EXISTS nota TEXT;

-- Recreamos ambas funciones con la firma ampliada (descuento + nota).
DROP FUNCTION IF EXISTS public.process_sale(UUID,JSONB,JSONB,UUID,UUID);
DROP FUNCTION IF EXISTS public.process_sale_core(UUID,UUID,JSONB,JSONB,UUID,UUID);

-- ------------------------------------------------------------
-- Núcleo (DEFINER): recibe la empresa explícita. Acepta líneas de catálogo
-- ({producto_id,cantidad}) y líneas libres ({descripcion,precio,cantidad?,tasa_iva?}).
-- ------------------------------------------------------------
CREATE FUNCTION public.process_sale_core(
  p_empresa        UUID,
  p_venta_id       UUID,
  p_lineas         JSONB,
  p_pagos          JSONB,
  p_usuario_id     UUID,
  p_sesion_caja_id UUID,
  p_descuento      NUMERIC DEFAULT 0,
  p_nota           TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa   UUID := p_empresa;
  v_bodega    UUID;
  v_total     NUMERIC := 0;
  v_neto      NUMERIC := 0;
  v_iva       NUMERIC := 0;
  v_recibido  NUMERIC := 0;
  v_qty       NUMERIC;
  v_lt        NUMERIC;
  v_ln        NUMERIC;
  v_li        NUMERIC;
  v_monto     NUMERIC;
  v_rec       NUMERIC;
  v_tipo      TEXT;
  v_pago_id   UUID;
  v_prod_id   TEXT;
  v_desc      TEXT;
  v_precio_u  NUMERIC;
  v_tasa      NUMERIC;
  v_descuento NUMERIC;
  v_factor    NUMERIC;
  rec         JSONB;
  prod        public.productos%ROWTYPE;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa' USING ERRCODE='28000'; END IF;

  -- Idempotencia: si ya existe esa venta, no reprocesar.
  IF EXISTS (SELECT 1 FROM public.ventas WHERE id = p_venta_id) THEN
    RETURN p_venta_id;
  END IF;

  SELECT id INTO v_bodega FROM public.bodegas
  WHERE empresa_id = v_empresa AND es_default LIMIT 1;

  INSERT INTO public.ventas (id, empresa_id, usuario_id, bodega_id, sesion_caja_id, estado)
  VALUES (p_venta_id, v_empresa, p_usuario_id, v_bodega, p_sesion_caja_id, 'completada')
  ON CONFLICT (id) DO NOTHING;

  FOR rec IN SELECT jsonb_array_elements(p_lineas) LOOP
    v_prod_id := nullif(trim(coalesce(rec->>'producto_id', '')), '');
    v_qty := coalesce((rec->>'cantidad')::NUMERIC, 1);

    IF v_prod_id IS NOT NULL THEN
      -- Línea de catálogo: precio autoritativo desde el producto.
      SELECT * INTO prod FROM public.productos
      WHERE id = v_prod_id::UUID AND empresa_id = v_empresa;
      IF NOT FOUND THEN RAISE EXCEPTION 'Producto inválido' USING ERRCODE='P0002'; END IF;

      v_lt  := coalesce(prod.precio_total, 0) * v_qty;
      v_ln  := CASE WHEN coalesce(prod.tasa_iva,0) > 0
                    THEN round(v_lt / (1 + prod.tasa_iva/100), 2) ELSE v_lt END;
      v_li  := v_lt - v_ln;

      INSERT INTO public.ventas_lineas (
        empresa_id, venta_id, producto_id, cantidad, precio_neto_unit,
        precio_total_unit, tasa_iva, monto_neto, monto_iva, monto_total)
      VALUES (v_empresa, p_venta_id, prod.id, v_qty, coalesce(prod.precio_neto,0),
              coalesce(prod.precio_total,0), coalesce(prod.tasa_iva,0), v_ln, v_li, v_lt);

      IF prod.controla_stock THEN
        INSERT INTO public.movimientos_inventario (empresa_id, producto_id, bodega_id, cantidad, tipo)
        VALUES (v_empresa, prod.id, v_bodega, -v_qty, 'venta');
      END IF;
    ELSE
      -- Cobro manual: concepto + monto, sin producto ni stock.
      v_desc     := nullif(trim(coalesce(rec->>'descripcion', '')), '');
      v_precio_u := coalesce((rec->>'precio')::NUMERIC, 0);
      v_tasa     := coalesce((rec->>'tasa_iva')::NUMERIC, 0);
      IF v_desc IS NULL THEN RAISE EXCEPTION 'Cobro manual sin concepto' USING ERRCODE='P0001'; END IF;
      IF v_precio_u <= 0 THEN RAISE EXCEPTION 'Cobro manual sin monto válido' USING ERRCODE='P0001'; END IF;

      v_lt := v_precio_u * v_qty;
      v_ln := CASE WHEN v_tasa > 0 THEN round(v_lt / (1 + v_tasa/100), 2) ELSE v_lt END;
      v_li := v_lt - v_ln;

      INSERT INTO public.ventas_lineas (
        empresa_id, venta_id, producto_id, descripcion, cantidad, precio_neto_unit,
        precio_total_unit, tasa_iva, monto_neto, monto_iva, monto_total)
      VALUES (v_empresa, p_venta_id, NULL, v_desc, v_qty,
              CASE WHEN v_qty > 0 THEN round(v_ln / v_qty, 4) ELSE 0 END,
              v_precio_u, v_tasa, v_ln, v_li, v_lt);
    END IF;

    v_total := v_total + v_lt; v_neto := v_neto + v_ln; v_iva := v_iva + v_li;
  END LOOP;

  -- Descuento total: clamp a [0, total] y reparto proporcional sobre neto/IVA.
  v_descuento := least(greatest(coalesce(p_descuento, 0), 0), v_total);
  IF v_descuento > 0 AND v_total > 0 THEN
    v_factor := (v_total - v_descuento) / v_total;
    v_neto   := round(v_neto * v_factor, 2);
    v_iva    := round(v_iva  * v_factor, 2);
    v_total  := round(v_total - v_descuento, 2);
  END IF;

  FOR rec IN SELECT jsonb_array_elements(p_pagos) LOOP
    v_monto := (rec->>'monto')::NUMERIC;
    v_rec   := coalesce((rec->>'monto_recibido')::NUMERIC, v_monto);

    INSERT INTO public.ventas_pagos (empresa_id, venta_id, metodo_pago_id, monto, monto_recibido)
    VALUES (v_empresa, p_venta_id, (rec->>'metodo_pago_id')::UUID, v_monto, v_rec)
    RETURNING id INTO v_pago_id;

    v_recibido := v_recibido + v_rec;

    -- Solo el efectivo afecta el conteo físico de la caja.
    SELECT tipo INTO v_tipo FROM public.metodos_pago WHERE id = (rec->>'metodo_pago_id')::UUID;
    IF p_sesion_caja_id IS NOT NULL AND v_tipo = 'cash' THEN
      INSERT INTO public.movimientos_caja (empresa_id, sesion_caja_id, tipo, monto, venta_id)
      VALUES (v_empresa, p_sesion_caja_id, 'venta', v_monto, p_venta_id);
    END IF;
  END LOOP;

  UPDATE public.ventas
  SET monto_neto = v_neto, monto_iva = v_iva, monto_total = v_total,
      descuento = v_descuento, nota = nullif(trim(p_nota), ''),
      monto_recibido = v_recibido, vuelto = greatest(v_recibido - v_total, 0)
  WHERE id = p_venta_id;

  RETURN p_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_sale_core(UUID,UUID,JSONB,JSONB,UUID,UUID,NUMERIC,TEXT)
  FROM anon, public, authenticated;

-- ------------------------------------------------------------
-- process_sale (wrapper DEFINER): lo llama el POS con su JWT; resuelve la empresa
-- del token y delega en el núcleo. Contrato retrocompatible (descuento/nota tienen
-- default), así el camino existente del POS/offline no cambia.
-- ------------------------------------------------------------
CREATE FUNCTION public.process_sale(
  p_venta_id       UUID,
  p_lineas         JSONB,
  p_pagos          JSONB,
  p_usuario_id     UUID DEFAULT NULL,
  p_sesion_caja_id UUID DEFAULT NULL,
  p_descuento      NUMERIC DEFAULT 0,
  p_nota           TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_empresa UUID := public.get_tenant_id();
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;
  RETURN public.process_sale_core(
    v_empresa, p_venta_id, p_lineas, p_pagos, p_usuario_id, p_sesion_caja_id,
    p_descuento, p_nota);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID,NUMERIC,TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID,NUMERIC,TEXT) TO authenticated;

-- ------------------------------------------------------------
-- registrar_venta_mp: recreado para pasar descuento/nota guardados en el payload
-- del cobro (el POS los manda al crear el payment intent). Sin ellos → 0/NULL.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_venta_mp(p_cobro_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cobro   public.mp_cobros%ROWTYPE;
  v_venta   UUID;
  v_sesion  UUID;
BEGIN
  SELECT * INTO v_cobro FROM public.mp_cobros WHERE id = p_cobro_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro MP inexistente' USING ERRCODE='P0002'; END IF;

  v_sesion := NULLIF(v_cobro.payload->>'sesion_caja_id', '')::UUID;

  v_venta := public.process_sale_core(
    v_cobro.empresa_id,
    v_cobro.venta_id,
    coalesce(v_cobro.payload->'lineas', '[]'::jsonb),
    coalesce(v_cobro.payload->'pagos',  '[]'::jsonb),
    NULL,
    v_sesion,
    coalesce((v_cobro.payload->>'descuento')::NUMERIC, 0),
    NULLIF(v_cobro.payload->>'nota', '')
  );

  UPDATE public.mp_cobros
  SET estado = 'approved', actualizado_en = now()
  WHERE id = p_cobro_id;

  RETURN v_venta;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_venta_mp(UUID) FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_venta_mp(UUID) TO service_role;
