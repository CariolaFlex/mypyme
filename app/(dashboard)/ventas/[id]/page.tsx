import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp } from '@/lib/reportes';
import { ReimprimirBoleta } from './reimprimir';
import type { BoletaData } from '@/lib/boleta';

export const dynamic = 'force-dynamic';

type LineaRow = {
  cantidad: number;
  descripcion: string | null;
  precio_total_unit: number;
  monto_total: number;
  productos: { nombre: string } | null;
};
type PagoRow = { monto: number; monto_recibido: number; metodos_pago: { nombre: string } | null };

const fmtFechaHora = (s: string) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(s));

export default async function DetalleVentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: venta }, { data: lineasData }, { data: pagosData }, { data: empresa }, { data: config }] =
    await Promise.all([
      supabase
        .from('ventas')
        .select('id, fecha_venta, monto_neto, monto_iva, monto_total, descuento, nota, monto_recibido, vuelto, estado')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('ventas_lineas')
        .select('cantidad, descripcion, precio_total_unit, monto_total, productos(nombre)')
        .eq('venta_id', id)
        .order('creado_en'),
      supabase
        .from('ventas_pagos')
        .select('monto, monto_recibido, metodos_pago(nombre)')
        .eq('venta_id', id),
      supabase.from('empresas').select('rut, razon_social, giro, telefono, direccion').single(),
      supabase.from('configuracion_negocio').select('usa_iva, tasa_iva_default').maybeSingle(),
    ]);

  if (!venta) notFound();

  const lineas = (lineasData as unknown as LineaRow[] | null) ?? [];
  const pagos = (pagosData as unknown as PagoRow[] | null) ?? [];
  const descuento = Number(venta.descuento ?? 0);
  const subtotal = Number(venta.monto_total) + descuento;
  const ref = venta.id.slice(0, 8).toUpperCase();

  // Datos para reimprimir el comprobante (mismo formato que el POS).
  const boleta: BoletaData = {
    negocio: {
      razonSocial: empresa?.razon_social ?? 'Mi negocio',
      rut: empresa?.rut ?? '',
      giro: empresa?.giro ?? null,
      direccion: empresa?.direccion ?? null,
      telefono: empresa?.telefono ?? null,
      usaIva: config?.usa_iva ?? true,
      tasaIva: Number(config?.tasa_iva_default ?? 19),
    },
    lineas: lineas.map((l) => ({
      nombre: l.productos?.nombre ?? l.descripcion ?? 'Ítem',
      cantidad: Number(l.cantidad),
      precioUnit: Number(l.precio_total_unit),
      subtotal: Number(l.monto_total),
    })),
    subtotal,
    descuento,
    total: Number(venta.monto_total),
    pagos: pagos.map((p) => ({ nombre: p.metodos_pago?.nombre ?? 'Pago', monto: Number(p.monto) })),
    vuelto: Number(venta.vuelto ?? 0),
    nota: venta.nota,
    fecha: new Date(venta.fecha_venta),
    ref,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/ventas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Historial de ventas
        </Link>
        <ReimprimirBoleta data={boleta} />
      </div>

      <div>
        <h1 className="text-2xl font-bold">Venta N° {ref}</h1>
        <p className="text-sm text-muted-foreground">{fmtFechaHora(venta.fecha_venta)}</p>
      </div>

      {venta.nota && (
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Nota:</span> {venta.nota}
        </div>
      )}

      {/* Líneas */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalle</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ítem</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineas.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {l.productos?.nombre ?? l.descripcion ?? 'Ítem'}
                    {!l.productos && (
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        manual
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(l.cantidad)}</TableCell>
                  <TableCell className="text-right tabular-nums">{clp.format(Number(l.precio_total_unit))}</TableCell>
                  <TableCell className="text-right tabular-nums">{clp.format(Number(l.monto_total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totales */}
          <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
            {descuento > 0 && (
              <>
                <Fila label="Subtotal" value={clp.format(subtotal)} />
                <Fila label="Descuento" value={`− ${clp.format(descuento)}`} accent="emerald" />
              </>
            )}
            {config?.usa_iva && (
              <Fila label="Neto" value={clp.format(Number(venta.monto_neto))} muted />
            )}
            {config?.usa_iva && (
              <Fila label="IVA" value={clp.format(Number(venta.monto_iva))} muted />
            )}
            <div className="flex items-center justify-between pt-1 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{clp.format(Number(venta.monto_total))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pago</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {pagos.map((p, i) => (
            <Fila key={i} label={p.metodos_pago?.nombre ?? 'Pago'} value={clp.format(Number(p.monto))} />
          ))}
          {Number(venta.vuelto) > 0 && (
            <Fila label="Vuelto" value={clp.format(Number(venta.vuelto))} muted />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Fila({
  label, value, muted = false, accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: 'emerald';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground' : ''}>{label}</span>
      <span
        className={
          accent === 'emerald'
            ? 'tabular-nums text-emerald-600 dark:text-emerald-400'
            : muted
              ? 'tabular-nums text-muted-foreground'
              : 'tabular-nums'
        }
      >
        {value}
      </span>
    </div>
  );
}
