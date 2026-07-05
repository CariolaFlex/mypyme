'use client';

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { clp, fmtFecha } from '@/lib/reportes';

const INDIGO = 'oklch(0.54 0.205 277)';
// Paleta de la marca (índigo → violeta → azul) para segmentos.
const PALETA = [
  'oklch(0.54 0.205 277)',
  'oklch(0.62 0.17 292)',
  'oklch(0.66 0.15 256)',
  'oklch(0.72 0.13 230)',
  'oklch(0.58 0.13 300)',
  'oklch(0.7 0.12 200)',
];

export type VarianteChart = 'barras' | 'linea' | 'area';

type PorDia = { dia: string; num_ventas: number; total: number };
type PorMetodo = { metodo: string; total: number };

const ejeMiles = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-popover)',
  color: 'var(--color-popover-foreground)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
} as const;

const ejes = {
  x: { tick: { fontSize: 11, fill: 'var(--color-muted-foreground)' }, tickLine: false, axisLine: false },
  y: { tickFormatter: ejeMiles, tick: { fontSize: 11, fill: 'var(--color-muted-foreground)' }, tickLine: false, axisLine: false, width: 36 },
};

/** Ventas por día, con variante seleccionable (barras/línea/área) y degradado
 *  de marca. Los colores son fijos para leerse bien en claro y oscuro. */
export function VentasPorDiaChart({
  data,
  variante = 'barras',
}: {
  data: PorDia[];
  variante?: VarianteChart;
}) {
  if (!data?.length) return <Vacio label="Sin ventas en el período." />;
  const rows = data.map((d) => ({ ...d, dia: fmtFecha(d.dia), total: Number(d.total) }));
  const gradId = 'grad-ventas';

  const defs = (
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={INDIGO} stopOpacity={0.95} />
        <stop offset="100%" stopColor={INDIGO} stopOpacity={variante === 'area' ? 0.05 : 0.55} />
      </linearGradient>
    </defs>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      {variante === 'linea' ? (
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="dia" {...ejes.x} />
          <YAxis {...ejes.y} />
          <Tooltip formatter={(v) => [clp.format(Number(v)), 'Total']} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="total" stroke={INDIGO} strokeWidth={3} dot={{ r: 3, fill: INDIGO }} activeDot={{ r: 5 }} />
        </LineChart>
      ) : variante === 'area' ? (
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {defs}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="dia" {...ejes.x} />
          <YAxis {...ejes.y} />
          <Tooltip formatter={(v) => [clp.format(Number(v)), 'Total']} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="total" stroke={INDIGO} strokeWidth={2.5} fill={`url(#${gradId})`} />
        </AreaChart>
      ) : (
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {defs}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="dia" {...ejes.x} />
          <YAxis {...ejes.y} />
          <Tooltip cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }} formatter={(v) => [clp.format(Number(v)), 'Total']} contentStyle={tooltipStyle} />
          <Bar dataKey="total" fill={`url(#${gradId})`} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export function VentasPorMetodoChart({ data }: { data: PorMetodo[] }) {
  if (!data?.length) return <Vacio label="Sin pagos en el período." />;
  const rows = data.map((d) => ({ ...d, total: Number(d.total) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={rows} dataKey="total" nameKey="metodo" innerRadius={55} outerRadius={90} paddingAngle={2} strokeWidth={2}>
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
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
