-- ============================================================
-- Gestionala — Reporte de cobros Mercado Pago Point (Fase 2, incremento 1)
-- Agregaciones de SOLO LECTURA sobre mp_cobros. SECURITY INVOKER: la RLS de
-- mp_cobros filtra por tenant sola (igual que los reporte_ventas_*). No exponen
-- datos nuevos. Rango [p_desde, p_hasta); cortes por día en America/Santiago.
-- ============================================================

-- ------------------------------------------------------------
-- Resumen: nº de cobros por estado, total cobrado (aprobados) y ticket promedio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_mp_resumen(
  p_desde TIMESTAMPTZ,
  p_hasta TIMESTAMPTZ
)
RETURNS TABLE (
  num_cobros       BIGINT,
  num_aprobados    BIGINT,
  num_rechazados   BIGINT,
  num_cancelados   BIGINT,
  total_aprobado   NUMERIC,
  ticket_promedio  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    count(*)::BIGINT,
    count(*) FILTER (WHERE estado = 'approved')::BIGINT,
    count(*) FILTER (WHERE estado = 'rejected')::BIGINT,
    count(*) FILTER (WHERE estado = 'canceled')::BIGINT,
    coalesce(sum(monto) FILTER (WHERE estado = 'approved'), 0),
    coalesce(round(avg(monto) FILTER (WHERE estado = 'approved'), 0), 0)
  FROM public.mp_cobros
  WHERE creado_en >= p_desde
    AND creado_en <  p_hasta;
$$;

-- ------------------------------------------------------------
-- Cobros aprobados por día (corte America/Santiago) — para la serie/tabla.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reporte_mp_por_dia(
  p_desde TIMESTAMPTZ,
  p_hasta TIMESTAMPTZ
)
RETURNS TABLE (
  dia    DATE,
  num    BIGINT,
  total  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    (creado_en AT TIME ZONE 'America/Santiago')::DATE AS dia,
    count(*)::BIGINT,
    coalesce(sum(monto), 0)
  FROM public.mp_cobros
  WHERE estado = 'approved'
    AND creado_en >= p_desde
    AND creado_en <  p_hasta
  GROUP BY 1
  ORDER BY 1;
$$;

-- ------------------------------------------------------------
-- Grants: auto-expose OFF → execute explícito a authenticated, nunca a anon.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.reporte_mp_resumen(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reporte_mp_por_dia(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.reporte_mp_resumen(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reporte_mp_por_dia(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
