import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  clp, fmtFecha, inicioDiaSantiago, inicioHaceDias, inicioMesSantiago,
} from '@/lib/reportes';

export const dynamic = 'force-dynamic';

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: 'mes', label: 'Este mes' },
  { key: '30d', label: 'Últimos 30 días' },
] as const;
type RangoKey = (typeof RANGOS)[number]['key'];

function desdePara(rango: RangoKey, ahora: Date): Date {
  switch (rango) {
    case 'hoy': return inicioDiaSantiago(ahora);
    case '7d': return inicioHaceDias(6, ahora);
    case '30d': return inicioHaceDias(29, ahora);
    case 'mes':
    default: return inicioMesSantiago(ahora);
  }
}

type Resumen = { num_ventas: number; total: number; neto: number; iva: number; ticket_promedio: number };

export default async function ReporteVentasPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango: RangoKey = (RANGOS.some((r) => r.key === rangoRaw) ? rangoRaw : 'mes') as RangoKey;

  const supabase = await createClient();
  const ahora = new Date();
  const desde = desdePara(rango, ahora).toISOString();
  const hasta = ahora.toISOString();

  const [
    { data: resumen },
    { data: porMetodo },
    { data: porDia },
    { data: top },
  ] = await Promise.all([
    supabase.rpc('reporte_ventas_resumen', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_por_metodo', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_por_dia', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_top_productos', { p_desde: desde, p_hasta: hasta, p_limite: 10 }),
  ]);

  const R = (resumen?.[0] as Resumen | undefined) ?? null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporte de ventas</h1>
        <p className="text-sm text-muted-foreground">Totales, métodos de pago y productos por período.</p>
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
