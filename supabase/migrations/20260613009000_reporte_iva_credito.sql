-- ============================================================
-- mypyme — Reporte IVA crédito (cierra el F29)
-- Crédito fiscal mensual a partir de los gastos con IVA. Junto con el débito
-- de ventas (reporte_iva_mensual) completa el F29: a pagar = débito - crédito.
-- gastos.fecha ya es DATE en hora local (Santiago) → agrupa directo, sin tz.
-- ============================================================
CREATE OR REPLACE FUNCTION public.reporte_iva_credito_mensual(
  p_anio INT
)
RETURNS TABLE (
  mes          INT,
  neto         NUMERIC,
  iva_credito  NUMERIC,
  num_gastos   BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    extract(MONTH FROM fecha)::INT AS mes,
    coalesce(sum(monto_neto), 0),
    coalesce(sum(monto_iva), 0),
    count(*)::BIGINT
  FROM public.gastos
  WHERE extract(YEAR FROM fecha) = p_anio
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE EXECUTE ON FUNCTION public.reporte_iva_credito_mensual(INT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reporte_iva_credito_mensual(INT) TO authenticated;
