// Export CSV del reporte de IVA (F29). Mismo dato que la página: débito − crédito
// por mes para el año pedido, con fila de totales. BOM es-CL.
import { createClient } from '@/lib/supabase/server';
import { MESES } from '@/lib/reportes';
import { toCsv, csvResponse, n } from '@/lib/csv';

export const dynamic = 'force-dynamic';

type FilaDebito = { mes: number; iva_debito: number };
type FilaCredito = { mes: number; iva_credito: number };
type Cell = string | number | null;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('anio');
  const anio = Number.isInteger(Number(raw)) ? Number(raw) : new Date().getFullYear();

  const supabase = await createClient();
  const [{ data: debitoData }, { data: creditoData }] = await Promise.all([
    supabase.rpc('reporte_iva_mensual', { p_anio: anio }),
    supabase.rpc('reporte_iva_credito_mensual', { p_anio: anio }),
  ]);

  const debitoPorMes = new Map(
    ((debitoData as FilaDebito[] | null) ?? []).map((f) => [f.mes, n(f.iva_debito)])
  );
  const creditoPorMes = new Map(
    ((creditoData as FilaCredito[] | null) ?? []).map((f) => [f.mes, n(f.iva_credito)])
  );

  const rows: Cell[][] = [];
  rows.push([`Reporte de IVA (F29) - Año ${anio}`]);
  rows.push([]);
  rows.push(['Mes', 'IVA débito', 'IVA crédito', 'Resultado']);

  let totDebito = 0;
  let totCredito = 0;
  MESES.forEach((nombre, i) => {
    const debito = debitoPorMes.get(i + 1) ?? 0;
    const credito = creditoPorMes.get(i + 1) ?? 0;
    totDebito += debito;
    totCredito += credito;
    rows.push([nombre, debito, credito, debito - credito]);
  });
  rows.push([`Total ${anio}`, totDebito, totCredito, totDebito - totCredito]);

  return csvResponse(`iva-f29-${anio}.csv`, toCsv(rows));
}
