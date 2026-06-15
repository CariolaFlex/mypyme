// Export CSV del reporte de ventas. Corre los mismos RPCs que la página
// (RLS aplica por la sesión) y devuelve un CSV sectorizado con BOM es-CL.
import { createClient } from '@/lib/supabase/server';
import { fmtFecha, RANGOS, desdePara, normalizarRango } from '@/lib/reportes';
import { toCsv, csvResponse, n } from '@/lib/csv';

export const dynamic = 'force-dynamic';

type Cell = string | number | null;

export async function GET(request: Request) {
  const rango = normalizarRango(new URL(request.url).searchParams.get('rango'));
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

  const label = RANGOS.find((r) => r.key === rango)!.label;
  const rows: Cell[][] = [];

  rows.push(['Reporte de ventas', label]);
  rows.push([]);

  const R = resumen?.[0];
  rows.push(['Resumen']);
  rows.push(['Total', 'N° ventas', 'Ticket promedio', 'Neto', 'IVA débito']);
  rows.push([n(R?.total), n(R?.num_ventas), n(R?.ticket_promedio), n(R?.neto), n(R?.iva)]);
  rows.push([]);

  rows.push(['Por método de pago']);
  rows.push(['Método', 'Pagos', 'Total']);
  for (const m of porMetodo ?? []) rows.push([m.metodo, n(m.num_pagos), n(m.total)]);
  rows.push([]);

  rows.push(['Por día']);
  rows.push(['Día', 'Ventas', 'Total']);
  for (const d of porDia ?? []) rows.push([fmtFecha(d.dia), n(d.num_ventas), n(d.total)]);
  rows.push([]);

  rows.push(['Por cajero']);
  rows.push(['Cajero', 'Ventas', 'Ticket promedio', 'Total']);
  for (const c of porCajero ?? []) rows.push([c.cajero, n(c.num_ventas), n(c.ticket_promedio), n(c.total)]);
  rows.push([]);

  rows.push(['Productos más vendidos']);
  rows.push(['Producto', 'Cantidad', 'Total']);
  for (const t of top ?? []) rows.push([t.nombre, n(t.cantidad), n(t.total)]);

  return csvResponse(`ventas-${rango}.csv`, toCsv(rows));
}
