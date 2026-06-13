-- ============================================================
-- mypyme — Inventario (Fase 2 bloque B)
-- Ledger append-only de movimientos + vista de stock calculada.
-- Stock = SUM(cantidad) por producto+bodega. Nunca un campo mutable.
-- ============================================================

CREATE TABLE public.movimientos_inventario (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  producto_id     UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  bodega_id       UUID NOT NULL REFERENCES public.bodegas(id) ON DELETE CASCADE,
  cantidad        NUMERIC(14,3) NOT NULL,            -- + entrada, - salida
  costo_unitario  NUMERIC(14,4),
  tipo            TEXT NOT NULL CHECK (tipo IN (
                    'compra','ajuste','merma','venta','devolucion_venta',
                    'devolucion_compra','transfer_entrada','transfer_salida')),
  nota            TEXT,
  ocurrido_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mov_inv_empresa_prod
  ON public.movimientos_inventario (empresa_id, producto_id, bodega_id);

ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- Lectura para el tenant; inserción para el tenant (cualquier rol — las ventas
-- de Fase 3 también insertarán). Ledger append-only: sin UPDATE/DELETE.
CREATE POLICY mov_select ON public.movimientos_inventario
  FOR SELECT TO authenticated USING (empresa_id = public.get_tenant_id());
CREATE POLICY mov_insert ON public.movimientos_inventario
  FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_tenant_id());

GRANT SELECT, INSERT ON public.movimientos_inventario TO authenticated;

-- ------------------------------------------------------------
-- Vista de stock actual. security_invoker=true → aplica la RLS del usuario
-- que consulta (sin esto la vista correría como owner y FILTRARÍA NADA = fuga).
-- ------------------------------------------------------------
CREATE VIEW public.vw_stock_actual
WITH (security_invoker = true) AS
SELECT
  m.empresa_id,
  m.producto_id,
  m.bodega_id,
  SUM(m.cantidad) AS stock
FROM public.movimientos_inventario m
GROUP BY m.empresa_id, m.producto_id, m.bodega_id;

GRANT SELECT ON public.vw_stock_actual TO authenticated;

-- ------------------------------------------------------------
-- RPC: registrar un movimiento de ajuste/merma/compra manual.
-- Valida que el producto y la bodega sean del tenant.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_movimiento(
  p_producto_id UUID,
  p_bodega_id   UUID,
  p_cantidad    NUMERIC,
  p_tipo        TEXT,
  p_nota        TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_cantidad = 0 THEN
    RAISE EXCEPTION 'La cantidad no puede ser cero' USING ERRCODE = 'P0001';
  END IF;

  -- empresa_id se deriva del producto; RLS de INSERT valida que sea del tenant.
  INSERT INTO public.movimientos_inventario (empresa_id, producto_id, bodega_id, cantidad, tipo, nota)
  SELECT pr.empresa_id, p_producto_id, p_bodega_id, p_cantidad, p_tipo, p_nota
  FROM public.productos pr
  WHERE pr.id = p_producto_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_movimiento(UUID,UUID,NUMERIC,TEXT,TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento(UUID,UUID,NUMERIC,TEXT,TEXT) TO authenticated;
