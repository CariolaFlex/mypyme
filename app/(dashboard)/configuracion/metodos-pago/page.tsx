import { createClient } from '@/lib/supabase/server';
import { crearMetodo, toggleMetodo } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        <p className="text-sm text-muted-foreground">Los que aceptas al cobrar en el POS.</p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={crearMetodo} className="flex gap-2">
        <Input name="nombre" required placeholder="Nombre (ej. App Mercado Pago)" />
        <select
          name="tipo"
          className="rounded-md border border-input bg-transparent px-2 text-sm shadow-xs"
        >
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="other">Otro</option>
        </select>
        <Button type="submit">Agregar</Button>
      </form>

      <div className="divide-y rounded-md border">
        {metodos?.length ? (
          metodos.map((m) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-3 py-2 text-sm ${m.activo ? '' : 'opacity-50'}`}
            >
              <span>
                {m.nombre}{' '}
                <span className="text-muted-foreground">· {TIPOS[m.tipo ?? 'other'] ?? m.tipo}</span>
              </span>
              <form action={toggleMetodo}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="activo" value={String(m.activo)} />
                <Button type="submit" variant="ghost" size="sm">
                  {m.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </form>
            </div>
          ))
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Sin métodos de pago.
          </div>
        )}
      </div>
    </div>
  );
}
