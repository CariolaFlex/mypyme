import Link from 'next/link';
import { Download, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  clp, fmtFecha, RANGOS, desdePara, normalizarRango, fechaSantiago,
} from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type GastoRow = {
  fecha: string;
  descripcion: string;
  monto_neto: number;
  monto_iva: number;
  monto_total: number;
  categorias_gasto: { nombre: string } | null;
};
type VentasResumen = { total: number };

export default async function ReporteGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango = normalizarRango(rangoRaw);

  const supabase = await createClient();
  const ahora = new Date();
  const desdeDate = desdePara(rango, ahora);
  const desdeStr = fechaSantiago(desdeDate);
  const hastaStr = fechaSantiago(ahora);

  const [{ data: gastosData }, { data: ventasResumen }] = await Promise.all([
    supabase
      .from('gastos')
      .select('fecha, descripcion, monto_neto, monto_iva, monto_total, categorias_gasto(nombre)')
      .gte('fecha', desdeStr)
      .lte('fecha', hastaStr)
      .order('fecha', { ascending: false }),
    // Ventas del mismo período (RPC existente, rango en instantes UTC).
    supabase.rpc('reporte_ventas_resumen', {
      p_desde: desdeDate.toISOString(),
      p_hasta: ahora.toISOString(),
    }),
  ]);

  const gastos = (gastosData as unknown as GastoRow[] | null) ?? [];
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto_total), 0);
  const totalNeto = gastos.reduce((s, g) => s + Number(g.monto_neto), 0);
  const totalIva = gastos.reduce((s, g) => s + Number(g.monto_iva), 0);

  const ventasTotal = Number((ventasResumen?.[0] as VentasResumen | undefined)?.total ?? 0);
  const resultado = ventasTotal - totalGastos;

  // Agrupar por categoría (monto + %).
  const porCategoria = Object.values(
    gastos.reduce<Record<string, { nombre: string; total: number; n: number }>>((acc, g) => {
      const nombre = g.categorias_gasto?.nombre ?? 'Sin categoría';
      (acc[nombre] ??= { nombre, total: 0, n: 0 });
      acc[nombre].total += Number(g.monto_total);
      acc[nombre].n += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // Agrupar por día.
  const porDia = Object.values(
    gastos.reduce<Record<string, { dia: string; total: number; n: number }>>((acc, g) => {
      (acc[g.fecha] ??= { dia: g.fecha, total: 0, n: 0 });
      acc[g.fecha].total += Number(g.monto_total);
      acc[g.fecha].n += 1;
      return acc;
    }, {})
  ).sort((a, b) => (a.dia < b.dia ? 1 : -1));

  const rangoLabel = RANGOS.find((r) => r.key === rango)!.label.toLowerCase();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reporte de gastos</h1>
          <p className="text-sm text-muted-foreground">En qué se va la plata y cuánto te queda, por período.</p>
        </div>
        <a
          href={`/reportes/gastos/export?rango=${rango}`}
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
            href={`/reportes/gastos?rango=${r.key}`}
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

      {/* Resultado del período: ventas − gastos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resultado {rangoLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border bg-emerald-500/5 px-4 py-3">
              <TrendingUp className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs text-muted-foreground">Ingresos (ventas)</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{clp.format(ventasTotal)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-red-500/5 px-4 py-3">
              <TrendingDown className="size-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-muted-foreground">Egresos (gastos)</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400">{clp.format(totalGastos)}</p>
              </div>
            </div>
            <div className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3',
              resultado >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
            )}>
              <Scale className="size-5 shrink-0 text-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Resultado</p>
                <p className={cn(
                  'text-lg font-bold',
                  resultado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {resultado >= 0 ? '+' : '−'}{clp.format(Math.abs(resultado))}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Resultado operativo simple = ventas − gastos del período. No incluye compras a inventario ni
            pagos a proveedores (esos son costo de mercadería, no gasto).
          </p>
        </CardContent>
      </Card>

      {/* KPIs de gastos */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total gastado" value={clp.format(totalGastos)} sub={`${gastos.length} ${gastos.length === 1 ? 'gasto' : 'gastos'}`} />
        <Kpi label="Neto" value={clp.format(totalNeto)} />
        <Kpi label="IVA crédito" value={clp.format(totalIva)} sub="Recuperable en el F29" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Por categoría */}
        <Card>
          <CardHeader><CardTitle className="text-base">Por categoría</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porCategoria.length ? (
                  porCategoria.map((c) => (
                    <TableRow key={c.nombre}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-right">{c.n}</TableCell>
                      <TableCell className="text-right">{clp.format(c.total)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {totalGastos > 0 ? Math.round((c.total / totalGastos) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <Vacio cols={4} />
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
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porDia.length ? (
                  porDia.map((d) => (
                    <TableRow key={d.dia}>
                      <TableCell>{fmtFecha(d.dia)}</TableCell>
                      <TableCell className="text-right">{d.n}</TableCell>
                      <TableCell className="text-right">{clp.format(d.total)}</TableCell>
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

      {/* Detalle */}
      <Card>
        <CardHeader><CardTitle className="text-base">Detalle</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.length ? (
                gastos.slice(0, 100).map((g, i) => (
                  <TableRow key={i}>
                    <TableCell>{fmtFecha(g.fecha)}</TableCell>
                    <TableCell className="max-w-52 truncate">{g.descripcion}</TableCell>
                    <TableCell className="text-muted-foreground">{g.categorias_gasto?.nombre ?? '—'}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(g.monto_total))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <Vacio cols={4} />
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
        Sin gastos en el período.
      </TableCell>
    </TableRow>
  );
}
