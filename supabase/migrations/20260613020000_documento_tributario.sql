-- Bloque C (auditoría UX/UI §4.4 / §5.11 / §5.12): tipo de documento tributario.
-- Permite clasificar gastos y facturas de proveedor por documento. Clave para el
-- F29: SOLO las facturas generan crédito fiscal IVA deducible; boletas y sin
-- documento no. Las exentas van con IVA 0.
--
-- Valores: factura | boleta | factura_exenta | boleta_exenta | sin_documento
-- Default 'factura' → preserva el comportamiento histórico del F29 (las filas
-- existentes se entraron con IVA como si fueran factura).

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'factura'
  CHECK (tipo_documento IN ('factura','boleta','factura_exenta','boleta_exenta','sin_documento'));

ALTER TABLE public.facturas_proveedor
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT NOT NULL DEFAULT 'factura'
  CHECK (tipo_documento IN ('factura','boleta','factura_exenta','boleta_exenta','sin_documento'));

-- Crédito fiscal mensual: SOLO facturas. Antes sumaba todos los gastos con IVA.
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
    AND tipo_documento = 'factura'
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE EXECUTE ON FUNCTION public.reporte_iva_credito_mensual(INT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reporte_iva_credito_mensual(INT) TO authenticated;
