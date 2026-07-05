// Export CSV del reporte de gastos. Misma consulta que la página (RLS por sesión):
// gastos del período + ventas (RPC) para el resultado. CSV sectorizado con BOM es-CL.
import { createClient } from '@/lib/supabase/server';
import { fmtFecha, RANGOS, desdePara, normalizarRango, fechaSantiago } from '@/lib/reportes';
import { toCsv, csvResponse, n } from '@/lib/csv';

export const dynamic = 'force-dynamic';

type Cell = string | number | null;
type GastoRow = {
  fecha: string;
  descripcion: string;
  monto_neto: number;
  monto_iva: number;
  monto_total: number;
  categorias_gasto: { nombre: string } | null;
};

export async function GET(request: Request) {
  const rango = normalizarRango(new URL(request.url).searchParams.get('rango'));
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
    supabase.rpc('reporte_ventas_resumen', {
      p_desde: desdeDate.toISOString(),
      p_hasta: ahora.toISOString(),
    }),
  ]);

  const gastos = (gastosData as unknown as GastoRow[] | null) ?? [];
  const totalGastos = gastos.reduce((s, g) => s + n(g.monto_total), 0);
  const ventasTotal = n((ventasResumen?.[0] as { total: number } | undefined)?.total);

  const porCategoria = Object.values(
    gastos.reduce<Record<string, { nombre: string; total: number; num: number }>>((acc, g) => {
      const nombre = g.categorias_gasto?.nombre ?? 'Sin categoría';
      (acc[nombre] ??= { nombre, total: 0, num: 0 });
      acc[nombre].total += n(g.monto_total);
      acc[nombre].num += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const label = RANGOS.find((r) => r.key === rango)!.label;
  const rows: Cell[][] = [];

  rows.push(['Reporte de gastos', label]);
  rows.push([]);

  rows.push(['Resultado del período']);
  rows.push(['Ingresos (ventas)', 'Egresos (gastos)', 'Resultado']);
  rows.push([ventasTotal, totalGastos, ventasTotal - totalGastos]);
  rows.push([]);

  rows.push(['Por categoría']);
  rows.push(['Categoría', 'N° gastos', 'Total']);
  for (const c of porCategoria) rows.push([c.nombre, c.num, c.total]);
  rows.push([]);

  rows.push(['Detalle']);
  rows.push(['Fecha', 'Descripción', 'Categoría', 'Neto', 'IVA', 'Total']);
  for (const g of gastos) {
    rows.push([
      fmtFecha(g.fecha),
      g.descripcion,
      g.categorias_gasto?.nombre ?? '',
      n(g.monto_neto),
      n(g.monto_iva),
      n(g.monto_total),
    ]);
  }

  return csvResponse(`gastos-${rango}.csv`, toCsv(rows));
}
