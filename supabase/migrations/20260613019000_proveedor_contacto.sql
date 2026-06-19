-- Bloque B2b (auditoría UX/UI §5.9): contacto/vendedor opcional del proveedor.
-- Un proveedor (empresa) puede tener una persona de contacto / vendedor asignado.
-- Se modela como columnas en la misma fila (1 contacto por proveedor) — suficiente
-- para el caso de un micro-comercio; si más adelante se necesita 1:N, se crea tabla.
-- Las políticas/grants existentes de public.proveedores ya cubren estas columnas.

ALTER TABLE public.proveedores
  ADD COLUMN IF NOT EXISTS contacto_nombre   TEXT,
  ADD COLUMN IF NOT EXISTS contacto_telefono TEXT,
  ADD COLUMN IF NOT EXISTS contacto_email    TEXT;
