-- Etapa 1 (escáner de cámara): código de barras EAN/UPC opcional por producto.
-- El SKU sigue siendo el identificador interno (autogenerado por importar_catalogo
-- o tipeado). El código de barras es OPCIONAL (productos a granel no tienen) y se
-- usa para el lookup al escanear con la cámara.
-- Las políticas/grants existentes de public.productos ya cubren esta columna.

ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

-- Único por empresa, pero solo cuando hay código (NULLs no chocan entre sí).
CREATE UNIQUE INDEX IF NOT EXISTS uq_productos_codigo_barras
  ON public.productos (empresa_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL;
