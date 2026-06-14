-- ============================================================
-- mypyme — Roles: escritura operativa para empleados · Sprint 1B
--
-- Modelo acordado: el empleado puede crear/editar/borrar los DATOS OPERATIVOS
-- del día a día (catálogo, inventario, compras, gastos) — todo queda en la
-- bitácora (Sprint 1A). Las ZONAS DE CONTROL siguen siendo solo-admin:
--   metodos_pago, configuracion_negocio, usuarios_empresa, empresas, suscripción.
--
-- Aquí relajamos la escritura de las tablas operativas de "solo admin" a
-- "cualquier miembro del tenant". El aislamiento entre empresas se mantiene
-- (empresa_id = get_tenant_id()). El gating de UI lo hace el frontend.
-- ============================================================

-- Catálogo / inventario
DROP POLICY IF EXISTS prod_admin_write ON public.productos;
CREATE POLICY prod_write ON public.productos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS cat_admin_write ON public.categorias_producto;
CREATE POLICY cat_write ON public.categorias_producto
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS bod_admin_write ON public.bodegas;
CREATE POLICY bod_write ON public.bodegas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

-- Compras / gastos
DROP POLICY IF EXISTS proveedores_admin ON public.proveedores;
CREATE POLICY proveedores_write ON public.proveedores
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS catgasto_admin ON public.categorias_gasto;
CREATE POLICY catgasto_write ON public.categorias_gasto
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS gastos_admin ON public.gastos;
CREATE POLICY gastos_write ON public.gastos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS oc_admin ON public.ordenes_compra;
CREATE POLICY oc_write ON public.ordenes_compra
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS ocl_admin ON public.ordenes_compra_lineas;
CREATE POLICY ocl_write ON public.ordenes_compra_lineas
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

DROP POLICY IF EXISTS fact_admin ON public.facturas_proveedor;
CREATE POLICY fact_write ON public.facturas_proveedor
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id())
  WITH CHECK (empresa_id = public.get_tenant_id());

-- NOTA: metodos_pago, configuracion_negocio, usuarios_empresa y empresas
-- conservan su política admin-only a propósito (zonas de control).
-- El RPC importar_catalogo sigue siendo admin-only (herramienta de carga masiva).
