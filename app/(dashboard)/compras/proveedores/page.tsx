import { createClient } from '@/lib/supabase/server';
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
      <div>
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <p className="text-sm text-muted-foreground">Quiénes te abastecen.</p>
      </div>

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
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                Aún no hay proveedores.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
