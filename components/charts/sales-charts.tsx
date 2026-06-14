'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

type PorDia = { dia: string; num_ventas: number; total: number };
type PorMetodo = { metodo: string; total: number };

const ejeMiles = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`);

export function VentasPorDiaChart({ data }: { data: PorDia[] }) {
  if (!data?.length) return <Vacio label="Sin ventas en el período." />;
  const rows = data.map((d) => ({ ...d, dia: fmtFecha(d.dia), total: Number(d.total) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={ejeMiles} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
          formatter={(v) => [clp.format(Number(v)), 'Total']}
          contentStyle={{
            borderRadius: 10, border: '1px solid var(--color-border)',
            background: 'var(--color-popover)', fontSize: 12,
          }}
        />
        <Bar dataKey="total" fill={INDIGO} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
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
        <Tooltip
          formatter={(v, n) => [clp.format(Number(v)), String(n)]}
          contentStyle={{
            borderRadius: 10, border: '1px solid var(--color-border)',
            background: 'var(--color-popover)', fontSize: 12,
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12 }}
        />
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
