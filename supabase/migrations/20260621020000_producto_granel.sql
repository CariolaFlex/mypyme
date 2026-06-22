-- ============================================================
-- mypyme — Productos a granel / por peso
-- Flag para distinguir productos que se venden por unidad (default) de los que
-- se venden por peso/medida variable (kg, g, L, etc.). Cuando granel=true,
-- productos.precio_total se interpreta como PRECIO POR unidad_medida (ej. $/kg)
-- y la venta usa cantidad decimal (ventas_lineas.cantidad ya es NUMERIC(14,3)).
-- Cubierto por los grants/RLS existentes de la tabla productos.
-- ============================================================

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS granel BOOLEAN NOT NULL DEFAULT false;
