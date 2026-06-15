import { Tags } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { crearCategoria, eliminarCategoria } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <PageHeader icon={Tags} title="Categorías" description="Organiza tus productos por categoría." />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={crearCategoria} className="flex gap-2">
        <Input name="nombre" required placeholder="Nueva categoría (ej. Bebidas)" />
        <Button type="submit">Agregar</Button>
      </form>

      <div className="divide-y rounded-md border">
        {categorias?.length ? (
          categorias.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{c.nombre}</span>
              <form action={eliminarCategoria}>
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  Eliminar
                </Button>
              </form>
            </div>
          ))
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Aún no hay categorías.
          </div>
        )}
      </div>
    </div>
  );
}
