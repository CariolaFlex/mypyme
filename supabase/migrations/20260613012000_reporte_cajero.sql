-- ============================================================
-- mypyme — Reporte de ventas por cajero (pendiente menor Fase 5)
-- Desglosa ventas por el usuario que las realizó (ventas.usuario_id),
-- mostrando su nombre/email.
--
-- A DIFERENCIA del resto de RPCs de reportes (SECURITY INVOKER), esta es
-- SECURITY DEFINER porque necesita leer auth.users para resolver el email del
-- cajero, tabla a la que el rol `authenticated` no tiene SELECT.
--
-- Como DEFINER bypasea la RLS de `ventas`, el aislamiento multi-tenant se
-- garantiza MANUALMENTE con `v.empresa_id = public.get_tenant_id()`. Si el JWT
-- no trae el claim, get_tenant_id() devuelve NULL → la comparación no matchea
-- ninguna fila (no hay fuga, devuelve vacío). El JOIN a auth.users solo expone
-- el email de cajeros que ya tienen ventas en ESTE tenant.
--
-- Convención de rangos: [p_desde, p_hasta)  (incluye desde, excluye hasta).
-- ============================================================

CREATE OR REPLACE FUNCTION public.reporte_ventas_por_cajero(
  p_desde TIMESTAMPTZ,
  p_hasta TIMESTAMPTZ
)
RETURNS TABLE (
  usuario_id       UUID,
  cajero           TEXT,
  num_ventas       BIGINT,
  total            NUMERIC,
  ticket_promedio  NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.usuario_id,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.email, '—') AS cajero,
    count(*)::BIGINT,
    coalesce(sum(v.monto_total), 0),
    coalesce(round(avg(v.monto_total), 0), 0)
  FROM public.ventas v
  LEFT JOIN auth.users u ON u.id = v.usuario_id
  WHERE v.empresa_id = public.get_tenant_id()
    AND v.estado = 'completada'
    AND v.fecha_venta >= p_desde
    AND v.fecha_venta <  p_hasta
  GROUP BY v.usuario_id, coalesce(u.raw_user_meta_data ->> 'full_name', u.email, '—')
  ORDER BY sum(v.monto_total) DESC;
$$;

-- Grants: auto-expose OFF → execute explícito a authenticated, nunca a anon.
REVOKE EXECUTE ON FUNCTION public.reporte_ventas_por_cajero(TIMESTAMPTZ, TIMESTAMPTZ) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.reporte_ventas_por_cajero(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
