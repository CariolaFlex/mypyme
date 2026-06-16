'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { clp } from '@/lib/reportes';

type Accent = 'brand' | 'slate' | 'amber' | 'emerald';

const ICON_GRAD: Record<Accent, string> = {
  brand: 'from-blue-500 to-blue-700',
  slate: 'from-slate-500 to-slate-700',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
};
const ORB: Record<Accent, string> = {
  brand: '#2563eb',
  slate: '#64748b',
  amber: '#f59e0b',
  emerald: '#10b981',
};

/** Cuenta animada (ease-out cubic) hacia `value`. */
function useCounter(value: number, duration = 1.1) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min((t - t0) / (duration * 1000), 1);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
}

export function StatCard({
  label,
  value,
  format = 'int',
  sub,
  icon: Icon,
  index = 0,
  accent = 'brand',
}: {
  label: string;
  value: number;
  format?: 'clp' | 'int';
  sub?: React.ReactNode;
  icon: LucideIcon;
  index?: number;
  accent?: Accent;
}) {
  const n = useCounter(value);
  const shown = format === 'clp' ? clp.format(Math.round(n)) : Math.round(n).toLocaleString('es-CL');

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl glass p-5 shadow-sm"
    >
      <div
        className="absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: ORB[accent] }}
      />
      <div className="relative">
        <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg ${ICON_GRAD[accent]}`}>
          <Icon className="size-[18px]" />
        </div>
        <div className="text-[1.7rem] font-black leading-none tracking-tight tabular-nums">{shown}</div>
        <div className="mt-1.5 text-sm font-semibold">{label}</div>
        {sub != null && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </motion.div>
  );
}
