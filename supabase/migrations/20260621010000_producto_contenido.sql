-- Contenido por unidad: cantidad que contiene cada ítem, expresada en su
-- unidad_medida (ej. una "Coca Cola" con contenido=1.5 y unidad_medida='L' = 1,5 L;
-- "Harina" con contenido=1 y unidad_medida='kg" = 1 kg). OPCIONAL (productos a
-- granel o sin tamaño definido lo dejan vacío).
-- Las políticas/grants existentes de public.productos ya cubren esta columna.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS contenido NUMERIC;
