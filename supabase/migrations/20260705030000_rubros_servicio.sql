-- ============================================================
-- Rubros de servicio: amplía el catálogo de tipo_negocio para cubrir los
-- comercios de servicio que el POS ya soporta (cobro manual + fichas sin stock):
-- barbería, salud (kine/consultas), dental, estética, transporte (taxi/flete),
-- mascotas (peluquería/vet), educación (clases). Se conservan los rubros previos.
--
-- El valor calza con TipoNegocio (lib/ocr/types.ts) y TIPOS_NEGOCIO
-- (lib/tipos-negocio.ts). El parser OCR trata los rubros nuevos con su
-- comportamiento genérico (no requieren manejo especial de facturas).
-- ============================================================

ALTER TABLE public.configuracion_negocio
  DROP CONSTRAINT IF EXISTS configuracion_negocio_tipo_negocio_check;

ALTER TABLE public.configuracion_negocio
  ADD CONSTRAINT configuracion_negocio_tipo_negocio_check
  CHECK (tipo_negocio IS NULL OR tipo_negocio IN (
    'minimarket', 'restaurante', 'ferreteria', 'farmacia',
    'servicio_tecnico', 'construccion', 'arriendo', 'profesional', 'otro',
    'barberia', 'salud', 'dental', 'estetica', 'transporte', 'mascotas', 'educacion'
  ));
