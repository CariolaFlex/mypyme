import { Truck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { crearProveedor, toggleProveedor } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function ProveedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre, rut, email, telefono, activo')
    .order('nombre');

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={Truck}
        title="Proveedores"
        description="Quiénes te abastecen."
        help={
          <>
            <p>Tus proveedores son las empresas o personas a las que les <strong>compras mercadería</strong>.</p>
            <p>Los registras una vez acá para después asociarlos a tus órdenes de compra, facturas y gastos.</p>
          </>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo proveedor</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={crearProveedor} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" required placeholder="Distribuidora Sur" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" placeholder="77.777.777-7" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="contacto@proveedor.cl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" placeholder="+56 9 1234 5678" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Agregar proveedor</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>RUT</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead></TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proveedores?.length ? (
            proveedores.map((p) => (
              <TableRow key={p.id} className={p.activo ? undefined : 'opacity-50'}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.rut ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.email ?? p.telefono ?? '—'}
                </TableCell>
                <TableCell>
                  {p.activo ? (
                    <Badge variant="secondary">Activo</Badge>
                  ) : (
                    <Badge variant="outline">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <form action={toggleProveedor}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="activo" value={String(p.activo)} />
                    <Button type="submit" variant="ghost" size="sm">
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5}>
                <EmptyState
                  icon={Truck}
                  title="Aún no hay proveedores"
                  description="Agrega quién te abastece con el formulario de arriba."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
