import Link from 'next/link';
import { Receipt, ArrowRight, Tag, StickyNote } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { clp, RANGOS, desdePara, normalizarRango } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type VentaRow = {
  id: string;
  fecha_venta: string;
  monto_total: number;
  descuento: number;
  nota: string | null;
  ventas_pagos: { monto: number; metodos_pago: { nombre: string } | null }[];
  ventas_lineas: { count: number }[];
};

const fmtFechaHora = (s: string) =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(s));

export default async function HistorialVentasPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango = normalizarRango(rangoRaw);
  const supabase = await createClient();
  const desdeIso = desdePara(rango, new Date()).toISOString();

  const { data } = await supabase
    .from('ventas')
    .select('id, fecha_venta, monto_total, descuento, nota, ventas_pagos(monto, metodos_pago(nombre)), ventas_lineas(count)')
    .eq('estado', 'completada')
    .gte('fecha_venta', desdeIso)
    .order('fecha_venta', { ascending: false })
    .limit(300);

  const ventas = (data as unknown as VentaRow[] | null) ?? [];
  const total = ventas.reduce((s, v) => s + Number(v.monto_total), 0);

  const metodoLabel = (v: VentaRow) => {
    const nombres = Array.from(new Set(v.ventas_pagos.map((p) => p.metodos_pago?.nombre).filter(Boolean)));
    if (nombres.length === 0) return '—';
    if (nombres.length === 1) return nombres[0];
    return 'Varios';
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={Receipt}
        title="Historial de ventas"
        description="Cada boleta con su detalle: productos, servicios, cobros manuales, descuento y nota."
        help={
          <>
            <p>Toca una venta para ver su detalle completo y reimprimir el comprobante.</p>
            <p>El <strong>descuento</strong> y la <strong>nota</strong> quedan guardados en cada venta.</p>
          </>
        }
      />

      {/* Período + total */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.key}
            href={`/ventas?rango=${r.key}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              r.key === rango ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            {r.label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {ventas.length} venta(s) · <strong className="text-foreground">{clp.format(total)}</strong>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>N°</TableHead>
            <TableHead>Ítems</TableHead>
            <TableHead>Método</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ventas.length ? (
            ventas.map((v) => (
              <TableRow key={v.id} className="cursor-pointer">
                <TableCell className="whitespace-nowrap">{fmtFechaHora(v.fecha_venta)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {v.id.slice(0, 8).toUpperCase()}
                </TableCell>
                <TableCell>{v.ventas_lineas?.[0]?.count ?? 0}</TableCell>
                <TableCell>{metodoLabel(v)}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {Number(v.descuento) > 0 && (
                      <Tag className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label="Con descuento" />
                    )}
                    {v.nota && <StickyNote className="size-3.5 text-muted-foreground" aria-label="Con nota" />}
                    <span className="font-medium tabular-nums">{clp.format(Number(v.monto_total))}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/ventas/${v.id}`}
                    className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
                  >
                    Ver <ArrowRight className="size-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                No hay ventas en el período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
