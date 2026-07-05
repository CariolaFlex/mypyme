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

export const IngresosEgresosChart = dynamic(
  () => import('./flujo-charts').then((m) => m.IngresosEgresosChart),
  { ssr: false, loading: Skeleton }
);

export const ResultadoAcumuladoChart = dynamic(
  () => import('./flujo-charts').then((m) => m.ResultadoAcumuladoChart),
  { ssr: false, loading: Skeleton }
);

export const EgresosPorCategoriaChart = dynamic(
  () => import('./flujo-charts').then((m) => m.EgresosPorCategoriaChart),
  { ssr: false, loading: Skeleton }
);
