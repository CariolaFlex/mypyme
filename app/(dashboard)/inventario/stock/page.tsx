import { createClient } from '@/lib/supabase/server';
import { registrarMovimiento } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const selectCls =
  'w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs';

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: productos }, { data: stockRows }, { data: bodegas }] = await Promise.all([
    supabase.from('productos').select('id, sku, nombre, stock_minimo, activo').eq('activo', true).order('nombre'),
    supabase.from('vw_stock_actual').select('producto_id, stock'),
    supabase.from('bodegas').select('id, nombre, es_default').order('es_default', { ascending: false }),
  ]);

  const stockPorProducto = new Map<string, number>();
  for (const r of stockRows ?? []) {
    stockPorProducto.set(r.producto_id, (stockPorProducto.get(r.producto_id) ?? 0) + Number(r.stock));
  }
  const bodegaDefault = bodegas?.find((b) => b.es_default) ?? bodegas?.[0];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-sm text-muted-foreground">Stock actual (calculado desde los movimientos).</p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={registrarMovimiento} className="grid grid-cols-5 items-end gap-2 rounded-lg border p-4">
        <input type="hidden" name="bodega_id" value={bodegaDefault?.id ?? ''} />
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="producto_id">Producto</Label>
          <select id="producto_id" name="producto_id" required className={selectCls}>
            {productos?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="operacion">Operación</Label>
          <select id="operacion" name="operacion" required className={selectCls}>
            <option value="entrada">Entrada</option>
            <option value="merma">Merma</option>
            <option value="ajuste_pos">Ajuste +</option>
            <option value="ajuste_neg">Ajuste −</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input id="cantidad" name="cantidad" type="number" min="0" step="0.001" required />
        </div>
        <Button type="submit">Registrar</Button>
        <div className="col-span-5">
          <Input name="nota" placeholder="Nota (opcional): proveedor, motivo de merma, etc." />
        </div>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos?.length ? (
            productos.map((p) => {
              const stock = stockPorProducto.get(p.id) ?? 0;
              const bajo = p.stock_minimo != null && stock <= Number(p.stock_minimo);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell className="text-right font-medium">{stock}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.stock_minimo ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {bajo && <Badge variant="destructive">Stock bajo</Badge>}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                No hay productos activos. Crea uno en Productos.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
