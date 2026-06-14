'use client';

// Wrappers con dynamic import + ssr:false (Recharts es pesado y client-only).
// Se importan desde Server Components; reciben los datos por props serializables.
import dynamic from 'next/dynamic';

const Skeleton = () => <div className="h-[260px] animate-pulse rounded-lg bg-muted" />;

export const VentasPorDiaChart = dynamic(
  () => import('./sales-charts').then((m) => m.VentasPorDiaChart),
  { ssr: false, loading: Skeleton }
);

export const VentasPorMetodoChart = dynamic(
  () => import('./sales-charts').then((m) => m.VentasPorMetodoChart),
  { ssr: false, loading: Skeleton }
);
