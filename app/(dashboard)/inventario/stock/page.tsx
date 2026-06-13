import { createClient } from '@/lib/supabase/server';
import { registrarMovimiento } from './actions';

export const dynamic = 'force-dynamic';

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: productos }, { data: stockRows }, { data: bodegas }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, sku, nombre, stock_minimo, activo')
      .eq('activo', true)
      .order('nombre'),
    supabase.from('vw_stock_actual').select('producto_id, stock'),
    supabase.from('bodegas').select('id, nombre, es_default').order('es_default', { ascending: false }),
  ]);

  // Sumar stock por producto (todas las bodegas).
  const stockPorProducto = new Map<string, number>();
  for (const r of stockRows ?? []) {
    stockPorProducto.set(r.producto_id, (stockPorProducto.get(r.producto_id) ?? 0) + Number(r.stock));
  }

  const bodegaDefault = bodegas?.find((b) => b.es_default) ?? bodegas?.[0];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-sm text-gray-500">Stock actual (calculado desde los movimientos).</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={registrarMovimiento} className="grid grid-cols-5 items-end gap-2 rounded-md border p-4">
        <input type="hidden" name="bodega_id" value={bodegaDefault?.id ?? ''} />
        <div className="col-span-2 space-y-1">
          <label className="text-sm font-medium">Producto</label>
          <select name="producto_id" required className="w-full rounded-md border px-2 py-2 text-sm">
            {productos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Operación</label>
          <select name="operacion" required className="w-full rounded-md border px-2 py-2 text-sm">
            <option value="entrada">Entrada</option>
            <option value="merma">Merma</option>
            <option value="ajuste_pos">Ajuste +</option>
            <option value="ajuste_neg">Ajuste −</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Cantidad</label>
          <input
            name="cantidad"
            type="number"
            min="0"
            step="0.001"
            required
            className="w-full rounded-md border px-2 py-2 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white">
          Registrar
        </button>
        <div className="col-span-5 space-y-1">
          <input
            name="nota"
            placeholder="Nota (opcional): proveedor, motivo de merma, etc."
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </form>

      <table className="w-full text-sm">
        <thead className="border-b text-left text-gray-500">
          <tr>
            <th className="py-2">SKU</th>
            <th>Producto</th>
            <th className="text-right">Stock</th>
            <th className="text-right">Mínimo</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {productos?.length ? (
            productos.map((p) => {
              const stock = stockPorProducto.get(p.id) ?? 0;
              const bajo = p.stock_minimo != null && stock <= Number(p.stock_minimo);
              return (
                <tr key={p.id}>
                  <td className="py-2 font-mono text-xs">{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td className="text-right font-medium">{stock}</td>
                  <td className="text-right text-gray-400">{p.stock_minimo ?? '—'}</td>
                  <td className="text-right">
                    {bajo && (
                      <span className="rounded bg-red-600/15 px-2 py-0.5 text-xs text-red-700">
                        Stock bajo
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                No hay productos activos. Crea uno en Productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
