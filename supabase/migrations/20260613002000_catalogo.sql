-- ============================================================
-- mypyme — Catálogo (Fase 2 bloque A)
-- categorias_producto, productos, bodegas, metodos_pago
-- RLS multi-tenant: lectura para el tenant; escritura solo admin.
-- service_role hereda acceso por ALTER DEFAULT PRIVILEGES (migración 000200).
-- ============================================================

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------
CREATE TABLE public.categorias_producto (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  parent_id   UUID REFERENCES public.categorias_producto(id) ON DELETE SET NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE public.bodegas (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  es_default  BOOLEAN NOT NULL DEFAULT false,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nombre)
);

CREATE TABLE public.productos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sku             TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  categoria_id    UUID REFERENCES public.categorias_producto(id) ON DELETE SET NULL,
  unidad_medida   TEXT NOT NULL DEFAULT 'unidad',
  controla_stock  BOOLEAN NOT NULL DEFAULT true,
  activo          BOOLEAN NOT NULL DEFAULT true,
  precio_neto     NUMERIC(14,2),
  precio_total    NUMERIC(14,2),
  tasa_iva        NUMERIC(5,2),
  stock_minimo    NUMERIC(14,2),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, sku)
);

CREATE TABLE public.metodos_pago (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  tipo        TEXT,                       -- cash, card, transfer, other
  activo      BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (empresa_id, nombre)
);

CREATE INDEX idx_productos_empresa   ON public.productos (empresa_id, activo);
CREATE INDEX idx_productos_categoria ON public.productos (empresa_id, categoria_id);
CREATE INDEX idx_categorias_empresa  ON public.categorias_producto (empresa_id);

-- ------------------------------------------------------------
-- RLS (automatic RLS del proyecto ya las marca enabled; explícito por claridad)
-- ------------------------------------------------------------
ALTER TABLE public.categorias_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bodegas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodos_pago        ENABLE ROW LEVEL SECURITY;

-- Patrón por tabla: SELECT para el tenant; escritura (FOR ALL) solo admin.
-- categorias_producto
CREATE POLICY cat_select ON public.categorias_producto
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY cat_admin_write ON public.categorias_producto
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- bodegas
CREATE POLICY bod_select ON public.bodegas
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY bod_admin_write ON public.bodegas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- productos
CREATE POLICY prod_select ON public.productos
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY prod_admin_write ON public.productos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- metodos_pago
CREATE POLICY mp_select ON public.metodos_pago
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY mp_admin_write ON public.metodos_pago
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin')
  WITH CHECK (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

-- ------------------------------------------------------------
-- Grants Data API (auto-expose OFF → explícito para authenticated)
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_producto TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bodegas             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.productos           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metodos_pago        TO authenticated;
