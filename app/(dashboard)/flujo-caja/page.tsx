import Link from 'next/link';
import {
  Wallet, TrendingUp, TrendingDown, Scale, HandCoins, ArrowDownLeft, ArrowUpRight,
  Receipt, Download, ArrowRight, Banknote,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  clp, fmtFecha, RANGOS, desdePara, normalizarRango, fechaSantiago,
} from '@/lib/reportes';
import {
  IngresosEgresosChart, ResultadoAcumuladoChart, EgresosPorCategoriaChart,
} from '@/components/charts/dynamic';

export const dynamic = 'force-dynamic';

type PorDiaVenta = { dia: string; num_ventas: number; total: number };
type GastoRow = { fecha: string; descripcion: string; monto_total: number; monto_iva: number; categorias_gasto: { nombre: string } | null };
type DeudaRow = { tipo: string; saldo: number; fecha_vencimiento: string | null };
type Mov = { fecha: string; etiqueta: string; detalle: string; monto: number; entra: boolean };

const dia = (s: string) => s.slice(0, 10);

export default async function FlujoCajaPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango = normalizarRango(rangoRaw);
  const supabase = await createClient();

  const ahora = new Date();
  const desde = desdePara(rango, ahora);
  const desdeIso = desde.toISOString();
  const hastaIso = ahora.toISOString();
  const desdeStr = fechaSantiago(desde);
  const hastaStr = fechaSantiago(ahora);

  const [
    { data: resumen },
    { data: ventasPorDia },
    { data: gastosData },
    { data: deudasData },
    { data: sesion },
    { data: ultVentas },
    { data: ultGastos },
    { data: ultAbonos },
  ] = await Promise.all([
    supabase.rpc('reporte_ventas_resumen', { p_desde: desdeIso, p_hasta: hastaIso }),
    supabase.rpc('reporte_ventas_por_dia', { p_desde: desdeIso, p_hasta: hastaIso }),
    supabase
      .from('gastos')
      .select('fecha, descripcion, monto_total, monto_iva, categorias_gasto(nombre)')
      .gte('fecha', desdeStr).lte('fecha', hastaStr).order('fecha', { ascending: false }),
    supabase.from('deudas').select('tipo, saldo, fecha_vencimiento').eq('estado', 'pendiente'),
    supabase.from('sesiones_caja').select('id, monto_apertura').eq('estado', 'abierta').maybeSingle(),
    supabase.from('ventas').select('id, fecha_venta, monto_total').eq('estado', 'completada').order('fecha_venta', { ascending: false }).limit(8),
    supabase.from('gastos').select('creado_en, descripcion, monto_total').order('creado_en', { ascending: false }).limit(8),
    supabase.from('abonos_deuda').select('creado_en, monto, deudas(tipo, contraparte)').order('creado_en', { ascending: false }).limit(8),
  ]);

  // Efectivo en caja (sesión abierta) = apertura + movimientos de la sesión.
  let efectivoCaja: number | null = null;
  if (sesion?.id) {
    const { data: movs } = await supabase.from('movimientos_caja').select('monto').eq('sesion_caja_id', sesion.id);
    efectivoCaja = Number(sesion.monto_apertura ?? 0) + (movs ?? []).reduce((s, m) => s + Number(m.monto), 0);
  }

  const R = (resumen?.[0] as { total: number; iva: number; num_ventas: number } | undefined) ?? null;
  const ingresos = Number(R?.total ?? 0);
  const ivaDebito = Number(R?.iva ?? 0);

  const gastos = (gastosData as unknown as GastoRow[] | null) ?? [];
  const egresos = gastos.reduce((s, g) => s + Number(g.monto_total), 0);
  const ivaCredito = gastos.reduce((s, g) => s + Number(g.monto_iva), 0);
  const resultado = ingresos - egresos;
  const ivaAPagar = ivaDebito - ivaCredito;

  const deudas = (deudasData as DeudaRow[] | null) ?? [];
  const porCobrar = deudas.filter((d) => d.tipo === 'por_cobrar').reduce((s, d) => s + Number(d.saldo), 0);
  const porPagar = deudas.filter((d) => d.tipo === 'por_pagar').reduce((s, d) => s + Number(d.saldo), 0);

  // Serie combinada ingresos vs egresos por día.
  const ingByDia = new Map<string, number>();
  for (const v of (ventasPorDia as PorDiaVenta[] | null) ?? []) ingByDia.set(dia(v.dia), Number(v.total));
  const egrByDia = new Map<string, number>();
  for (const g of gastos) egrByDia.set(dia(g.fecha), (egrByDia.get(dia(g.fecha)) ?? 0) + Number(g.monto_total));
  const dias = Array.from(new Set([...ingByDia.keys(), ...egrByDia.keys()])).sort();
  const flujo = dias.map((d) => ({ dia: d, ingresos: ingByDia.get(d) ?? 0, egresos: egrByDia.get(d) ?? 0 }));

  // Egresos por categoría (dona).
  const egrCat = Object.values(
    gastos.reduce<Record<string, { nombre: string; total: number }>>((acc, g) => {
      const n = g.categorias_gasto?.nombre ?? 'Sin categoría';
      (acc[n] ??= { nombre: n, total: 0 });
      acc[n].total += Number(g.monto_total);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // Feed unificado de movimientos recientes (ventas, gastos, abonos de deuda).
  const movimientos: Mov[] = [
    ...((ultVentas as { fecha_venta: string; monto_total: number }[] | null) ?? []).map((v) => ({
      fecha: v.fecha_venta, etiqueta: 'Venta', detalle: 'Ingreso por venta', monto: Number(v.monto_total), entra: true,
    })),
    ...((ultGastos as { creado_en: string; descripcion: string; monto_total: number }[] | null) ?? []).map((g) => ({
      fecha: g.creado_en, etiqueta: 'Gasto', detalle: g.descripcion, monto: Number(g.monto_total), entra: false,
    })),
    ...((ultAbonos as unknown as { creado_en: string; monto: number; deudas: { tipo: string; contraparte: string } | null }[] | null) ?? []).map((a) => ({
      fecha: a.creado_en,
      etiqueta: a.deudas?.tipo === 'por_pagar' ? 'Abono pagado' : 'Abono cobrado',
      detalle: a.deudas?.contraparte ?? 'Deuda',
      monto: Number(a.monto),
      entra: a.deudas?.tipo !== 'por_pagar',
    })),
  ]
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 12);

  const rangoLabel = RANGOS.find((r) => r.key === rango)!.label.toLowerCase();

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        icon={Wallet}
        title="Flujo de caja"
        description="Todo el movimiento de tu dinero en un solo lugar: ingresos, egresos, resultado, deudas y caja."
        help={
          <>
            <p><strong>Ingresos</strong>: tus ventas del período. <strong>Egresos</strong>: tus gastos.</p>
            <p><strong>Resultado</strong> = ingresos − egresos (no incluye compras a inventario).</p>
            <p>Abajo ves las deudas pendientes, la caja y los últimos movimientos al día.</p>
          </>
        }
      />

      {/* Selector de período + export */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <Link
            key={r.key}
            href={`/flujo-caja?rango=${r.key}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              r.key === rango ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            {r.label}
          </Link>
        ))}
        <a
          href={`/reportes/gastos/export?rango=${rango}`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Download className="size-4" /> Exportar gastos
        </a>
      </div>

      {/* Resultado del período (3 columnas) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <FlujoKpi label="Ingresos (ventas)" value={ingresos} icon={<TrendingUp />} accent="emerald" sub={`${Number(R?.num_ventas ?? 0)} venta(s)`} />
        <FlujoKpi label="Egresos (gastos)" value={egresos} icon={<TrendingDown />} accent="rose" sub={`${gastos.length} gasto(s)`} />
        <FlujoKpi
          label="Resultado"
          value={resultado}
          icon={<Scale />}
          accent={resultado >= 0 ? 'emerald' : 'rose'}
          signo
          sub={`ganancia ${rangoLabel}`}
        />
      </div>

      {/* Deudas + caja + IVA (4 columnas) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FlujoKpi label="Te deben (por cobrar)" value={porCobrar} icon={<ArrowDownLeft />} accent="emerald" small href="/deudas?ver=cobrar" />
        <FlujoKpi label="Debes (por pagar)" value={porPagar} icon={<ArrowUpRight />} accent="rose" small href="/deudas?ver=pagar" />
        <FlujoKpi
          label="Efectivo en caja"
          value={efectivoCaja ?? 0}
          icon={<Banknote />}
          accent="slate"
          small
          sub={efectivoCaja === null ? 'caja cerrada' : 'sesión abierta'}
          href="/caja"
        />
        <FlujoKpi label="IVA a pagar (período)" value={ivaAPagar} icon={<Receipt />} accent="slate" small signo sub={`débito ${clp.format(ivaDebito)}`} href="/reportes/iva" />
      </div>

      {/* Gráficos: ingresos vs egresos + resultado acumulado */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Ingresos vs egresos por día</CardTitle></CardHeader>
          <CardContent><IngresosEgresosChart data={flujo} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resultado acumulado</CardTitle></CardHeader>
          <CardContent><ResultadoAcumuladoChart data={flujo} /></CardContent>
        </Card>
      </div>

      {/* Egresos por categoría + movimientos recientes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">En qué se va la plata</CardTitle></CardHeader>
          <CardContent><EgresosPorCategoriaChart data={egrCat} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Últimos movimientos</CardTitle>
            <HandCoins className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {movimientos.length ? (
              <ul className="divide-y">
                {movimientos.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full',
                        m.entra
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {m.entra ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.etiqueta}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.detalle} · {fmtFecha(m.fecha)}</p>
                    </div>
                    <span className={cn('shrink-0 text-sm font-semibold tabular-nums', m.entra ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                      {m.entra ? '+' : '−'}{clp.format(m.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos todavía.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos a los reportes detallados */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          ['/reportes/ventas', 'Reporte de ventas'],
          ['/reportes/gastos', 'Reporte de gastos'],
          ['/reportes/iva', 'Reporte IVA (F29)'],
          ['/deudas', 'Deudas'],
        ].map(([href, label]) => (
          <Link key={href} href={href} className="group inline-flex items-center gap-1 rounded-full border px-3 py-1.5 transition-colors hover:bg-accent">
            {label}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function FlujoKpi({
  label, value, icon, accent, sub, href, signo = false, small = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'emerald' | 'rose' | 'slate';
  sub?: string;
  href?: string;
  signo?: boolean;
  small?: boolean;
}) {
  const grad = {
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-500 to-red-600',
    slate: 'from-slate-500 to-slate-700',
  }[accent];
  const texto = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    slate: 'text-foreground',
  }[accent];
  const shown = `${signo && value > 0 ? '+' : signo && value < 0 ? '−' : ''}${clp.format(Math.abs(value))}`;

  const inner = (
    <div className="group relative overflow-hidden rounded-2xl glass p-4 shadow-sm transition-transform hover:-translate-y-0.5">
      <div className={cn('mb-2 inline-flex rounded-xl bg-gradient-to-br p-2 text-white shadow-lg [&_svg]:size-[17px]', grad)}>
        {icon}
      </div>
      <div className={cn('font-black leading-none tracking-tight tabular-nums', small ? 'text-lg' : 'text-2xl', texto)}>
        {shown}
      </div>
      <div className="mt-1 text-sm font-semibold">{label}</div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
