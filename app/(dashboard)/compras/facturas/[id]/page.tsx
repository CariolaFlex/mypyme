import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, fmtFecha } from '@/lib/reportes';
import { ESTADO_FACT, estadoFactVariante } from '../estado';
import { registrarPagoProveedor } from '../actions';

export const dynamic = 'force-dynamic';

type Pago = {
  id: string;
  fecha: string;
  monto: number;
  sesion_caja_id: string | null;
  metodos_pago: { nombre: string } | null;
};

export default async function FacturaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: fac } = await supabase
    .from('facturas_proveedor')
    .select('id, numero_factura, fecha, vencimiento, monto_neto, monto_iva, monto_total, saldo, estado, proveedores(nombre)')
    .eq('id', id)
    .maybeSingle();
  if (!fac) notFound();

  const [{ data: pagosData }, { data: metodos }, { data: sesion }] = await Promise.all([
    supabase
      .from('pagos_proveedor')
      .select('id, fecha, monto, sesion_caja_id, metodos_pago(nombre)')
      .eq('factura_id', id)
      .order('fecha', { ascending: false }),
    supabase.from('metodos_pago').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle(),
  ]);

  const proveedor = fac.proveedores as unknown as { nombre: string } | null;
  const pagos = (pagosData as unknown as Pago[] | null) ?? [];
  const cajaAbierta = !!sesion;
  const saldo = Number(fac.saldo);
  const puedePagar = saldo > 0 && fac.estado !== 'pagada' && fac.estado !== 'cancelada';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {fac.numero_factura} <span className="text-muted-foreground">· {proveedor?.nombre ?? '—'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link href="/compras/facturas" className="underline-offset-2 hover:underline">← Cuentas por pagar</Link>
            {' · '}Emitida {fmtFecha(fac.fecha)}
            {fac.vencimiento && <> · vence {fmtFecha(fac.vencimiento)}</>}
          </p>
        </div>
        <Badge variant={estadoFactVariante(fac.estado)}>{ESTADO_FACT[fac.estado] ?? fac.estado}</Badge>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Neto" value={clp.format(Number(fac.monto_neto))} />
        <Kpi label="IVA" value={clp.format(Number(fac.monto_iva))} />
        <Kpi label="Total" value={clp.format(Number(fac.monto_total))} />
        <Kpi label="Saldo" value={clp.format(saldo)} resaltar={saldo > 0} />
      </div>

      {puedePagar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Registrar pago</CardTitle></CardHeader>
          <CardContent>
            <form action={registrarPagoProveedor} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="factura_id" value={fac.id} />
              <div className="space-y-1.5">
                <Label htmlFor="monto">Monto</Label>
                <Input id="monto" name="monto" type="number" min="1" max={saldo} defaultValue={saldo} required className="w-32" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metodo_pago_id">Método</Label>
                <select id="metodo_pago_id" name="metodo_pago_id"
                  className="rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs">
                  {metodos?.map((m) => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
                </select>
              </div>
              <label className="flex h-9 items-center gap-2 text-sm">
                <input type="checkbox" name="pagar_efectivo" disabled={!cajaAbierta} className="size-4" />
                Efectivo (caja)
                {!cajaAbierta && <span className="text-xs text-muted-foreground">— sin caja</span>}
              </label>
              <Button type="submit">Pagar</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Pagos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Método</TableHead>
              <TableHead></TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.length ? (
              pagos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{fmtFecha(p.fecha)}</TableCell>
                  <TableCell>{p.metodos_pago?.nombre ?? '—'}</TableCell>
                  <TableCell>{p.sesion_caja_id && <span className="text-xs text-muted-foreground">efectivo (caja)</span>}</TableCell>
                  <TableCell className="text-right">{clp.format(Number(p.monto))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  Sin pagos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value, resaltar }: { label: string; value: string; resaltar?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold ${resaltar ? 'text-destructive' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
