-- ============================================================
-- Etapa 2 (OCR) — Escaneos de documentos (foco inicial: factura de proveedor).
-- Guarda el resultado del OCR (texto + datos estructurados editables) con estado
-- borrador → revisado → importado. Reemplaza la persistencia Firestore de Legis.
-- RLS: lectura/escritura del tenant (cualquier miembro puede escanear y preparar;
-- la creación de la factura va por crear_factura_proveedor con su propia RLS).
-- ============================================================

CREATE TABLE public.ocr_scans (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id      UUID REFERENCES auth.users(id),
  archivo_nombre  TEXT,
  texto_plano     TEXT,
  datos           JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {rut,razonSocial,folio,fecha,neto,iva,total,items}
  confianza       NUMERIC(5,2),                        -- 0..1 confianza promedio del OCR
  estado          TEXT NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador', 'revisado', 'importado')),
  factura_id      UUID REFERENCES public.facturas_proveedor(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ocr_scans_empresa ON public.ocr_scans (empresa_id, creado_en DESC);

ALTER TABLE public.ocr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY ocr_scans_select ON public.ocr_scans
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY ocr_scans_write ON public.ocr_scans
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_scans TO authenticated;
