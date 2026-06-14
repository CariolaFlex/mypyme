import Link from 'next/link';
import { importarCatalogo } from './actions';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const EJEMPLO = `Cappuccino; 2500; Cafés;
Espresso; 1800; Cafés;
Croissant; 1900; Pastelería; 30
Jugo natural; 2200; Bebidas; 24
Agua mineral; 1200; Bebidas; 48`;

export default async function ImportarPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importar catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Carga tu menú completo de una vez. Pega una línea por producto. Ideal para el primer día.
        </p>
      </div>

      {ok && (
        <p className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
          {ok} ·{' '}
          <Link href="/inventario/productos" className="underline">
            Ver productos
          </Link>
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <div className="font-medium">Formato</div>
        <p className="mt-1 text-muted-foreground">
          <code>Nombre; Precio; Categoría; Stock</code> — separa con <code>;</code> (o tabulación, o coma).
          El <strong>precio</strong> es con IVA (el neto se calcula solo). <strong>Categoría</strong> y{' '}
          <strong>stock</strong> son opcionales: si dejas el stock vacío, el producto no controla
          inventario (útil para preparados). Las categorías nuevas se crean solas. Puedes pegar desde Excel.
        </p>
      </div>

      <form action={importarCatalogo} className="space-y-3">
        <textarea
          name="datos"
          required
          rows={12}
          defaultValue={EJEMPLO}
          spellCheck={false}
          className="w-full rounded-md border border-input bg-transparent p-3 font-mono text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-3">
          <Button type="submit">Importar</Button>
          <span className="text-xs text-muted-foreground">
            Se importa todo o nada: si una línea falla, no se crea ninguna.
          </span>
        </div>
      </form>
    </div>
  );
}
