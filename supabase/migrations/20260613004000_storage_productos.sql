-- ============================================================
-- mypyme — Imagen de producto (Fase 2, pendiente)
-- Columna imagen_url + bucket de Storage "productos".
-- Lectura pública; escritura solo del tenant (carpeta = empresa_id).
-- ============================================================

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;

-- Bucket público (las imágenes de catálogo se muestran por URL pública).
INSERT INTO storage.buckets (id, name, public)
VALUES ('productos', 'productos', true)
ON CONFLICT (id) DO NOTHING;

-- Subida: solo authenticated, y el primer segmento del path debe ser su empresa_id.
CREATE POLICY productos_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'productos'
    AND (storage.foldername(name))[1] = public.get_tenant_id()::text
  );

CREATE POLICY productos_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'productos'
    AND (storage.foldername(name))[1] = public.get_tenant_id()::text
  );

CREATE POLICY productos_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'productos'
    AND (storage.foldername(name))[1] = public.get_tenant_id()::text
  );
