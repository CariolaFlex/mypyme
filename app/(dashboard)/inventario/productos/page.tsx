import { Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { crearProducto } from './actions';
import { ProductoRowActions } from './row-actions';
import { CodigoConEscaner } from '@/components/scanner/codigo-con-escaner';
import { ImagenProducto } from './imagen-producto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
const selectCls =
  'w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs';

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
      .select(
        'id, sku, nombre, codigo_barras, categoria_id, precio_total, precio_neto, tasa_iva, stock_minimo, activo, imagen_url, categorias_producto(nombre)'
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

      <form action={crearProducto} className="grid grid-cols-2 gap-3 rounded-lg border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" name="sku" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>
        <div className="col-span-2">
          <CodigoConEscaner />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria_id">Categoría</Label>
          <select id="categoria_id" name="categoria_id" className={selectCls}>
            <option value="">— Sin categoría —</option>
            {categorias?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="precio_total">Precio (c/IVA)</Label>
            <Input id="precio_total" name="precio_total" type="number" min="0" step="1" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tasa_iva">IVA %</Label>
            <Input id="tasa_iva" name="tasa_iva" type="number" min="0" step="0.01" defaultValue={tasaDefault} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock_minimo">Stock mínimo (opcional)</Label>
          <Input id="stock_minimo" name="stock_minimo" type="number" min="0" />
        </div>
        <ImagenProducto />
        <div className="col-span-2">
          <Button type="submit">Agregar producto</Button>
        </div>
      </form>

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
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{cat?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right">{clp.format(p.precio_total ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    <ProductoRowActions
                      producto={{
                        id: p.id,
                        sku: p.sku,
                        nombre: p.nombre,
                        codigo_barras: p.codigo_barras,
                        categoria_id: p.categoria_id,
                        precio_total: p.precio_total,
                        tasa_iva: p.tasa_iva,
                        stock_minimo: p.stock_minimo,
                        activo: p.activo,
                      }}
                      categorias={categorias ?? []}
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
