'use client';

// Gráficos del Flujo de Caja. Colores fijos (emerald ingresos, rose egresos,
// indigo resultado) elegidos para leerse bien en claro y oscuro; ejes/grid/tooltip
// usan los tokens del tema. Degradados para un acabado premium.
import {
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts';
import { clp, fmtFecha } from '@/lib/reportes';

const EMERALD = '#10b981';
const ROSE = '#f43f5e';
const INDIGO = 'oklch(0.54 0.205 277)';
const PALETA = ['#f43f5e', '#fb923c', '#f59e0b', '#a855f7', '#6366f1', '#0ea5e9', '#14b8a6', '#84cc16'];

const ejeMiles = (v: number) => {
  const a = Math.abs(v);
  return a >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`;
};
const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-popover)',
  color: 'var(--color-popover-foreground)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
} as const;
const xAxis = { tick: { fontSize: 11, fill: 'var(--color-muted-foreground)' }, tickLine: false, axisLine: false } as const;
const yAxis = { tickFormatter: ejeMiles, tick: { fontSize: 11, fill: 'var(--color-muted-foreground)' }, tickLine: false, axisLine: false, width: 40 } as const;

export type FlujoDia = { dia: string; ingresos: number; egresos: number };

/** Ingresos (barras verdes) vs egresos (barras rojas) por día. */
export function IngresosEgresosChart({ data }: { data: FlujoDia[] }) {
  if (!data?.length) return <Vacio label="Sin movimientos en el período." />;
  const rows = data.map((d) => ({ dia: fmtFecha(d.dia), ingresos: Number(d.ingresos), egresos: Number(d.egresos) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-ing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EMERALD} stopOpacity={0.95} />
            <stop offset="100%" stopColor={EMERALD} stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="grad-egr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ROSE} stopOpacity={0.95} />
            <stop offset="100%" stopColor={ROSE} stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="dia" {...xAxis} />
        <YAxis {...yAxis} />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          formatter={(v, n) => [clp.format(Number(v)), n === 'ingresos' ? 'Ingresos' : 'Egresos']}
          contentStyle={tooltipStyle}
        />
        <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => (v === 'ingresos' ? 'Ingresos' : 'Egresos')} />
        <Bar dataKey="ingresos" fill="url(#grad-ing)" radius={[5, 5, 0, 0]} maxBarSize={26} />
        <Bar dataKey="egresos" fill="url(#grad-egr)" radius={[5, 5, 0, 0]} maxBarSize={26} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Resultado acumulado (ingresos − egresos) día a día, como área. */
export function ResultadoAcumuladoChart({ data }: { data: FlujoDia[] }) {
  if (!data?.length) return <Vacio label="Sin datos en el período." />;
  // Acumulado hasta cada día (n pequeño: días del período, ≤ 31).
  const rows = data.map((d, i) => ({
    dia: fmtFecha(d.dia),
    acumulado: Math.round(
      data.slice(0, i + 1).reduce((s, x) => s + Number(x.ingresos) - Number(x.egresos), 0)
    ),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-res" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INDIGO} stopOpacity={0.45} />
            <stop offset="100%" stopColor={INDIGO} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="dia" {...xAxis} />
        <YAxis {...yAxis} />
        <ReferenceLine y={0} stroke="var(--color-border)" />
        <Tooltip formatter={(v) => [clp.format(Number(v)), 'Acumulado']} contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="acumulado" stroke={INDIGO} strokeWidth={2.5} fill="url(#grad-res)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export type CategoriaMonto = { nombre: string; total: number };

/** Composición de egresos (gastos por categoría) como dona. */
export function EgresosPorCategoriaChart({ data }: { data: CategoriaMonto[] }) {
  if (!data?.length) return <Vacio label="Sin gastos en el período." />;
  const rows = data.map((d) => ({ ...d, total: Number(d.total) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={rows} dataKey="total" nameKey="nombre" innerRadius={58} outerRadius={95} paddingAngle={2} strokeWidth={2}>
          {rows.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} stroke="var(--color-card)" />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [clp.format(Number(v)), String(n)]} contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Vacio({ label }: { label: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{label}</div>
  );
}
