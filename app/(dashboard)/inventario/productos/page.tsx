import { Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { ProductoRowActions } from './row-actions';
import { ProductoForm } from './producto-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: productos }, { data: categorias }, { data: config }] = await Promise.all([
    supabase
      .from('productos')
      .select(
        'id, sku, nombre, codigo_barras, unidad_medida, contenido, categoria_id, precio_total, precio_neto, tasa_iva, stock_minimo, granel, activo, imagen_url, categorias_producto(nombre)'
      )
      .order('nombre'),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('configuracion_negocio').select('tasa_iva_default').single(),
  ]);

  const tasaDefault = config?.tasa_iva_default ?? 19;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={Package}
        title="Productos"
        description="El precio se ingresa con IVA incluido."
        help={
          <>
            <p>Tu <strong>catálogo</strong>: todo lo que vendes.</p>
            <p>El precio se ingresa con <strong>IVA incluido</strong> (el sistema calcula el neto). ¿Tienes muchos? Cárgalos de una vez con «Importar catálogo».</p>
          </>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ProductoForm categorias={categorias ?? []} tasaDefault={tasaDefault} clearDraft={!!ok} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos?.length ? (
            productos.map((p) => {
              const cat = p.categorias_producto as unknown as { nombre: string } | null;
              return (
                <TableRow key={p.id} className={p.activo ? '' : 'opacity-40'}>
                  <TableCell>
                    {p.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imagen_url} alt={p.nombre} className="size-8 rounded object-cover" />
                    ) : (
                      <div className="size-8 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>
                    {p.nombre}
                    {p.contenido != null && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {p.contenido} {p.unidad_medida}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{cat?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right">{clp.format(p.precio_total ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    <ProductoRowActions
                      producto={{
                        id: p.id,
                        sku: p.sku,
                        nombre: p.nombre,
                        codigo_barras: p.codigo_barras,
                        unidad_medida: p.unidad_medida,
                        contenido: p.contenido,
                        categoria_id: p.categoria_id,
                        precio_total: p.precio_total,
                        tasa_iva: p.tasa_iva,
                        stock_minimo: p.stock_minimo,
                        granel: p.granel ?? false,
                        activo: p.activo,
                      }}
                      categorias={categorias ?? []}
                      tasaDefault={tasaDefault}
                    />
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6}>
                <EmptyState
                  icon={Package}
                  title="Aún no hay productos"
                  description="Crea tu primer producto con el formulario de arriba, o importa tu catálogo completo de una vez."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
