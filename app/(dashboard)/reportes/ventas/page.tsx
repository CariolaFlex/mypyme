import Link from 'next/link';
import { Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  clp, fmtFecha, RANGOS, desdePara, normalizarRango,
} from '@/lib/reportes';
import { VentasPorDiaChart, VentasPorMetodoChart } from '@/components/charts/dynamic';

export const dynamic = 'force-dynamic';

type Resumen = { num_ventas: number; total: number; neto: number; iva: number; ticket_promedio: number };

export default async function ReporteVentasPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango = normalizarRango(rangoRaw);

  const supabase = await createClient();
  const ahora = new Date();
  const desde = desdePara(rango, ahora).toISOString();
  const hasta = ahora.toISOString();

  const [
    { data: resumen },
    { data: porMetodo },
    { data: porDia },
    { data: top },
    { data: porCajero },
  ] = await Promise.all([
    supabase.rpc('reporte_ventas_resumen', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_por_metodo', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_por_dia', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_top_productos', { p_desde: desde, p_hasta: hasta, p_limite: 10 }),
    supabase.rpc('reporte_ventas_por_cajero', { p_desde: desde, p_hasta: hasta }),
  ]);

  const R = (resumen?.[0] as Resumen | undefined) ?? null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reporte de ventas</h1>
          <p className="text-sm text-muted-foreground">Totales, métodos de pago y productos por período.</p>
        </div>
        <a
          href={`/reportes/ventas/export?rango=${rango}`}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Download className="size-4" />
          Exportar CSV
        </a>
      </div>

      {/* Selector de rango */}
      <div className="flex flex-wrap gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.key}
            href={`/reportes/ventas?rango=${r.key}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              r.key === rango
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Total" value={clp.format(Number(R?.total ?? 0))} />
        <Kpi label="Ventas" value={String(Number(R?.num_ventas ?? 0))} />
        <Kpi label="Ticket promedio" value={clp.format(Number(R?.ticket_promedio ?? 0))} />
        <Kpi label="IVA débito" value={clp.format(Number(R?.iva ?? 0))} sub={`Neto ${clp.format(Number(R?.neto ?? 0))}`} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Ventas por día</CardTitle></CardHeader>
          <CardContent>
            <VentasPorDiaChart data={(porDia ?? []) as { dia: string; num_ventas: number; total: number }[]} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Distribución por método</CardTitle></CardHeader>
          <CardContent>
            <VentasPorMetodoChart data={(porMetodo ?? []) as { metodo: string; total: number }[]} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Por método de pago */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por método de pago</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porMetodo?.length ? (
                  porMetodo.map((m: { metodo_pago_id: string; metodo: string; num_pagos: number; total: number }) => (
                    <TableRow key={m.metodo_pago_id}>
                      <TableCell>{m.metodo}</TableCell>
                      <TableCell className="text-right">{Number(m.num_pagos)}</TableCell>
                      <TableCell className="text-right">{clp.format(Number(m.total))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <Vacio cols={3} />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Por día */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por día</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porDia?.length ? (
                  porDia.map((d: { dia: string; num_ventas: number; total: number }) => (
                    <TableRow key={d.dia}>
                      <TableCell>{fmtFecha(d.dia)}</TableCell>
                      <TableCell className="text-right">{Number(d.num_ventas)}</TableCell>
                      <TableCell className="text-right">{clp.format(Number(d.total))}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <Vacio cols={3} />
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Por cajero */}
      <Card>
        <CardHeader><CardTitle className="text-base">Por cajero</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cajero</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Ticket prom.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porCajero?.length ? (
                porCajero.map((c: { usuario_id: string; cajero: string; num_ventas: number; ticket_promedio: number; total: number }) => (
                  <TableRow key={c.usuario_id ?? c.cajero}>
                    <TableCell className="font-medium">{c.cajero}</TableCell>
                    <TableCell className="text-right">{Number(c.num_ventas)}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(c.ticket_promedio))}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(c.total))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <Vacio cols={4} />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top productos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Productos más vendidos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top?.length ? (
                top.map((t: { producto_id: string; nombre: string; cantidad: number; total: number }) => (
                  <TableRow key={t.producto_id}>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell className="text-right">{Number(t.cantidad)}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(t.total))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <Vacio cols={3} />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Vacio({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">
        Sin datos en el período.
      </TableCell>
    </TableRow>
  );
}
