import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, fmtFecha } from '@/lib/reportes';
import { ESTADO_OC, estadoVariante } from '../estado';
import { aprobarOrden, cancelarOrden } from '../actions';
import { RecibirOcClient } from './recibir-oc-client';

export const dynamic = 'force-dynamic';

type Linea = {
  id: string;
  cantidad: number;
  cantidad_recibida: number;
  costo_neto_unit: number;
  monto_total: number;
  productos: { nombre: string } | null;
};

export default async function OrdenDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: oc } = await supabase
    .from('ordenes_compra')
    .select('id, fecha, fecha_esperada, estado, monto_neto, monto_iva, monto_total, proveedores(nombre)')
    .eq('id', id)
    .maybeSingle();
  if (!oc) notFound();

  const { data: lineasData } = await supabase
    .from('ordenes_compra_lineas')
    .select('id, cantidad, cantidad_recibida, costo_neto_unit, monto_total, productos(nombre)')
    .eq('orden_compra_id', id)
    .order('creado_en');

  const proveedor = oc.proveedores as unknown as { nombre: string } | null;
  const lineas = (lineasData as unknown as Linea[] | null) ?? [];
  const pendientes = lineas
    .map((l) => ({ id: l.id, nombre: l.productos?.nombre ?? '—', pendiente: Number(l.cantidad) - Number(l.cantidad_recibida) }))
    .filter((l) => l.pendiente > 0);

  const puedeAprobar = oc.estado === 'borrador';
  const puedeRecibir = oc.estado === 'aprobada' || oc.estado === 'recibida_parcial';
  const puedeCancelar = oc.estado === 'borrador' || oc.estado === 'aprobada';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{proveedor?.nombre ?? 'Orden de compra'}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/compras/ordenes" className="underline-offset-2 hover:underline">← Órdenes</Link>
            {' · '}Emitida {fmtFecha(oc.fecha)}
            {oc.fecha_esperada && <> · esperada {fmtFecha(oc.fecha_esperada)}</>}
          </p>
        </div>
        <Badge variant={estadoVariante(oc.estado)}>{ESTADO_OC[oc.estado] ?? oc.estado}</Badge>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Líneas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Pedido</TableHead>
                <TableHead className="text-right">Recibido</TableHead>
                <TableHead className="text-right">Costo neto</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((l) => {
                const completa = Number(l.cantidad_recibida) >= Number(l.cantidad);
                return (
                  <TableRow key={l.id}>
                    <TableCell>{l.productos?.nombre ?? '—'}</TableCell>
                    <TableCell className="text-right">{Number(l.cantidad)}</TableCell>
                    <TableCell className={`text-right ${completa ? 'text-green-600' : ''}`}>
                      {Number(l.cantidad_recibida)}
                    </TableCell>
                    <TableCell className="text-right">{clp.format(Number(l.costo_neto_unit))}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(l.monto_total))}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-semibold">
                <TableCell colSpan={4}>Total (IVA {clp.format(Number(oc.monto_iva))})</TableCell>
                <TableCell className="text-right">{clp.format(Number(oc.monto_total))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Acciones según estado */}
      <div className="flex flex-wrap items-center gap-2">
        {puedeAprobar && (
          <form action={aprobarOrden}>
            <input type="hidden" name="oc_id" value={oc.id} />
            <Button type="submit">Aprobar</Button>
          </form>
        )}
        {puedeCancelar && (
          <form action={cancelarOrden}>
            <input type="hidden" name="oc_id" value={oc.id} />
            <Button type="submit" variant="outline" className="text-destructive">Cancelar</Button>
          </form>
        )}
      </div>

      {puedeRecibir && pendientes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recibir mercadería</CardTitle></CardHeader>
          <CardContent>
            <RecibirOcClient ocId={oc.id} lineas={pendientes} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
