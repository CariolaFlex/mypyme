-- ============================================================
-- POS para servicios: cobro manual (monto libre) + productos de servicio
--
-- Dos necesidades de los rubros de servicio (barbería, kinesiología, clínica
-- dental, taxi, profesional independiente):
--   1. Cobro manual: cobrar un concepto suelto sin tenerlo en el catálogo
--      («Sesión $25.000», «Carrera $4.500»). Es una línea de venta SIN producto.
--   2. Producto de servicio: una ficha reutilizable que NO controla stock
--      («Corte», «Consulta»). Ya se modela con productos.controla_stock=false;
--      esta migración solo habilita el cobro manual en la venta.
--
-- Cambio retrocompatible: las líneas con producto_id siguen igual; se agregan
-- líneas con producto_id NULL + descripcion + precio. Sin movimiento de stock.
-- Los reportes que hacen JOIN productos (top productos) excluyen estas líneas
-- naturalmente, que es lo correcto (un servicio no es "producto más vendido").
-- ============================================================

ALTER TABLE public.ventas_lineas ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE public.ventas_lineas ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ------------------------------------------------------------
-- process_sale: ahora acepta líneas de "cobro manual".
-- Formato de cada línea en p_lineas (JSONB):
--   producto (catálogo): { "producto_id": uuid, "cantidad": n }
--   cobro manual:        { "descripcion": text, "precio": total_c/IVA, "cantidad": n?, "tasa_iva": %? }
-- El resto del cuerpo es idéntico a la versión anterior (caja, pagos, vuelto).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale(
  p_venta_id      UUID,
  p_lineas        JSONB,
  p_pagos         JSONB,
  p_usuario_id    UUID DEFAULT NULL,
  p_sesion_caja_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_empresa   UUID := public.get_tenant_id();
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
  rec         JSONB;
  prod        public.productos%ROWTYPE;
BEGIN
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Sin empresa en el token' USING ERRCODE='28000'; END IF;

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
      monto_recibido = v_recibido, vuelto = greatest(v_recibido - v_total, 0)
  WHERE id = p_venta_id;

  RETURN p_venta_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID,JSONB,JSONB,UUID,UUID) TO authenticated;
