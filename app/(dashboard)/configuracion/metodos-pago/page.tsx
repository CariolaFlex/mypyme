import { createClient } from '@/lib/supabase/server';
import { crearMetodo, toggleMetodo } from './actions';

export const dynamic = 'force-dynamic';

const TIPOS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

export default async function MetodosPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: metodos } = await supabase
    .from('metodos_pago')
    .select('id, nombre, tipo, activo')
    .order('nombre');

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Métodos de pago</h1>
        <p className="text-sm text-gray-500">Los que aceptas al cobrar en el POS.</p>
      </div>

      {error && (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={crearMetodo} className="flex gap-2">
        <input
          name="nombre"
          required
          placeholder="Nombre (ej. App Mercado Pago)"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
        />
        <select name="tipo" className="rounded-md border px-2 py-2 text-sm">
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>
        <button type="submit" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white">
          Agregar
        </button>
      </form>

      <ul className="divide-y rounded-md border">
        {metodos?.length ? (
          metodos.map((m) => (
            <li
              key={m.id}
              className={`flex items-center justify-between px-3 py-2 text-sm ${m.activo ? '' : 'opacity-40'}`}
            >
              <span>
                {m.nombre} <span className="text-gray-400">· {TIPOS[m.tipo ?? 'other'] ?? m.tipo}</span>
              </span>
              <form action={toggleMetodo}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="activo" value={String(m.activo)} />
                <button type="submit" className="text-xs text-gray-500 hover:underline">
                  {m.activo ? 'Desactivar' : 'Activar'}
                </button>
              </form>
            </li>
          ))
        ) : (
          <li className="px-3 py-6 text-center text-sm text-gray-400">Sin métodos de pago.</li>
        )}
      </ul>
    </div>
  );
}
