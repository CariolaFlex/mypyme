import { createClient } from '@/lib/supabase/server';
import { crearProducto, toggleActivo } from './actions';

export const dynamic = 'force-dynamic';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: productos }, { data: categorias }, { data: config }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, sku, nombre, precio_total, activo, imagen_url, categorias_producto(nombre)')
      .order('nombre'),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('configuracion_negocio').select('tasa_iva_default').single(),
  ]);

  const tasaDefault = config?.tasa_iva_default ?? 19;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Productos</h1>
        <p className="text-sm text-gray-500">El precio se ingresa con IVA incluido.</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={crearProducto} className="grid grid-cols-2 gap-3 rounded-md border p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">SKU</label>
          <input name="sku" required className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre</label>
          <input name="nombre" required className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Categoría</label>
          <select name="categoria_id" className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">— Sin categoría —</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Precio (c/IVA)</label>
            <input
              name="precio_total"
              type="number"
              min="0"
              step="1"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">IVA %</label>
            <input
              name="tasa_iva"
              type="number"
              min="0"
              step="0.01"
              defaultValue={tasaDefault}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Stock mínimo (opcional)</label>
          <input
            name="stock_minimo"
            type="number"
            min="0"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Imagen (opcional)</label>
          <input
            name="imagen"
            type="file"
            accept="image/*"
            className="w-full rounded-md border px-3 py-1.5 text-sm file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs"
          />
        </div>
        <div className="col-span-2">
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Agregar producto
          </button>
        </div>
      </form>

      <table className="w-full text-sm">
        <thead className="border-b text-left text-gray-500">
          <tr>
            <th className="py-2 w-12"></th>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th className="text-right">Precio</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {productos?.length ? (
            productos.map((p) => {
              const cat = p.categorias_producto as unknown as { nombre: string } | null;
              return (
                <tr key={p.id} className={p.activo ? '' : 'opacity-40'}>
                  <td className="py-2">
                    {p.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imagen_url}
                        alt={p.nombre}
                        className="size-8 rounded object-cover"
                      />
                    ) : (
                      <div className="size-8 rounded bg-gray-100" />
                    )}
                  </td>
                  <td className="font-mono text-xs">{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td className="text-gray-500">{cat?.nombre ?? '—'}</td>
                  <td className="text-right">{clp.format(p.precio_total ?? 0)}</td>
                  <td className="text-right">
                    <form action={toggleActivo}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="activo" value={String(p.activo)} />
                      <button type="submit" className="text-xs text-gray-500 hover:underline">
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="py-6 text-center text-gray-400">
                Aún no hay productos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
