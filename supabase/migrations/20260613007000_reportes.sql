-- ============================================================
-- mypyme — Reportes (Fase 5)
-- Funciones de agregación de SOLO LECTURA sobre ventas / ventas_lineas /
-- ventas_pagos. Todas SECURITY INVOKER: la RLS de las tablas base filtra por
-- tenant automáticamente (igual que process_sale). No exponen datos nuevos,
-- solo agregan lo que el usuario ya puede leer.
--
-- Convención de rangos: [p_desde, p_hasta)  (incluye desde, excluye hasta).
-- Los cortes por día/mes/año se hacen en zona horaria America/Santiago para
-- que "hoy" y los totales del F29 coincidan con la realidad del negocio.
-- ============================================================

-- ------------------------------------------------------------
-- Resumen de ventas para un rango: nº ventas, totales y ticket promedio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_ventas_resumen(
  p_desde TIMESTAMPTZ,
  p_hasta TIMESTAMPTZ
)
RETURNS TABLE (
  num_ventas       BIGINT,
  total            NUMERIC,
  neto             NUMERIC,
  iva              NUMERIC,
  ticket_promedio  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    count(*)::BIGINT,
    coalesce(sum(monto_total), 0),
    coalesce(sum(monto_neto), 0),
    coalesce(sum(monto_iva), 0),
    coalesce(round(avg(monto_total), 0), 0)
  FROM public.ventas
  WHERE estado = 'completada'
    AND fecha_venta >= p_desde
    AND fecha_venta <  p_hasta;
$$;

-- ------------------------------------------------------------
-- Top productos por monto vendido en un rango.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_top_productos(
  p_desde   TIMESTAMPTZ,
  p_hasta   TIMESTAMPTZ,
  p_limite  INT DEFAULT 5
)
RETURNS TABLE (
  producto_id  UUID,
  nombre       TEXT,
  cantidad     NUMERIC,
  total        NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT vl.producto_id, p.nombre, sum(vl.cantidad), sum(vl.monto_total)
  FROM public.ventas_lineas vl
  JOIN public.ventas v   ON v.id = vl.venta_id
  JOIN public.productos p ON p.id = vl.producto_id
  WHERE v.estado = 'completada'
    AND v.fecha_venta >= p_desde
    AND v.fecha_venta <  p_hasta
  GROUP BY vl.producto_id, p.nombre
  ORDER BY sum(vl.monto_total) DESC
  LIMIT p_limite;
$$;

-- ------------------------------------------------------------
-- Ventas agrupadas por método de pago en un rango.
-- Suma sobre ventas_pagos (un pago = un método); soporta multi-pago futuro.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_ventas_por_metodo(
  p_desde TIMESTAMPTZ,
  p_hasta TIMESTAMPTZ
)
RETURNS TABLE (
  metodo_pago_id  UUID,
  metodo          TEXT,
  num_pagos       BIGINT,
  total           NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT mp.id, mp.nombre, count(*)::BIGINT, coalesce(sum(vp.monto), 0)
  FROM public.ventas_pagos vp
  JOIN public.ventas v       ON v.id = vp.venta_id
  JOIN public.metodos_pago mp ON mp.id = vp.metodo_pago_id
  WHERE v.estado = 'completada'
    AND v.fecha_venta >= p_desde
    AND v.fecha_venta <  p_hasta
  GROUP BY mp.id, mp.nombre
  ORDER BY sum(vp.monto) DESC;
$$;

-- ------------------------------------------------------------
-- Ventas por día (corte America/Santiago) en un rango. Para tabla/serie.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_ventas_por_dia(
  p_desde TIMESTAMPTZ,
  p_hasta TIMESTAMPTZ
)
RETURNS TABLE (
  dia         DATE,
  num_ventas  BIGINT,
  total       NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (fecha_venta AT TIME ZONE 'America/Santiago')::DATE AS dia,
    count(*)::BIGINT,
    coalesce(sum(monto_total), 0)
  FROM public.ventas
  WHERE estado = 'completada'
    AND fecha_venta >= p_desde
    AND fecha_venta <  p_hasta
  GROUP BY 1
  ORDER BY 1;
$$;

-- ------------------------------------------------------------
-- IVA débito por mes del año (corte America/Santiago) — insumo F29.
-- El crédito fiscal vendrá de compras/gastos (Fase 4); aquí solo el débito.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_iva_mensual(
  p_anio INT
)
RETURNS TABLE (
  mes         INT,
  neto        NUMERIC,
  iva_debito  NUMERIC,
  num_ventas  BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    extract(MONTH FROM (fecha_venta AT TIME ZONE 'America/Santiago'))::INT AS mes,
    coalesce(sum(monto_neto), 0),
    coalesce(sum(monto_iva), 0),
    count(*)::BIGINT
  FROM public.ventas
  WHERE estado = 'completada'
    AND extract(YEAR FROM (fecha_venta AT TIME ZONE 'America/Santiago')) = p_anio
  GROUP BY 1
  ORDER BY 1;
$$;

-- ------------------------------------------------------------
-- Grants: auto-expose OFF → execute explícito a authenticated, nunca a anon.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.reporte_ventas_resumen(TIMESTAMPTZ, TIMESTAMPTZ)        FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reporte_top_productos(TIMESTAMPTZ, TIMESTAMPTZ, INT)     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reporte_ventas_por_metodo(TIMESTAMPTZ, TIMESTAMPTZ)      FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reporte_ventas_por_dia(TIMESTAMPTZ, TIMESTAMPTZ)         FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reporte_iva_mensual(INT)                                 FROM anon, public;

GRANT EXECUTE ON FUNCTION public.reporte_ventas_resumen(TIMESTAMPTZ, TIMESTAMPTZ)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_top_productos(TIMESTAMPTZ, TIMESTAMPTZ, INT)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_ventas_por_metodo(TIMESTAMPTZ, TIMESTAMPTZ)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_ventas_por_dia(TIMESTAMPTZ, TIMESTAMPTZ)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_iva_mensual(INT)                                 TO authenticated;
