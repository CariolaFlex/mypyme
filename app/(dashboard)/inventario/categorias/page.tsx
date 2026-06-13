import { createClient } from '@/lib/supabase/server';
import { crearCategoria, eliminarCategoria } from './actions';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from('categorias_producto')
    .select('id, nombre')
    .order('nombre');

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorías</h1>
        <p className="text-sm text-gray-500">Organiza tus productos por categoría.</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={crearCategoria} className="flex gap-2">
        <input
          name="nombre"
          required
          placeholder="Nueva categoría (ej. Bebidas)"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Agregar
        </button>
      </form>

      <ul className="divide-y rounded-md border">
        {categorias?.length ? (
          categorias.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{c.nombre}</span>
              <form action={eliminarCategoria}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-red-600 hover:underline">
                  Eliminar
                </button>
              </form>
            </li>
          ))
        ) : (
          <li className="px-3 py-6 text-center text-sm text-gray-400">Aún no hay categorías.</li>
        )}
      </ul>
    </div>
  );
}
