// Export CSV de Deudas. Corre la misma query que la página (RLS por sesión) y
// devuelve un CSV con BOM es-CL. Honra los filtros ?ver=cobrar|pagar|pagadas|vencidas
// y ?q= (busca en nombre/descripción) para que exportes exactamente lo que ves.
import { createClient } from '@/lib/supabase/server';
import { fmtFecha } from '@/lib/reportes';
import { toCsv, csvResponse, n } from '@/lib/csv';

export const dynamic = 'force-dynamic';

type Cell = string | number | null;

const TIPO_LABEL: Record<string, string> = { por_cobrar: 'Por cobrar', por_pagar: 'Por pagar' };
const CAT_LABEL: Record<string, string> = {
  cliente: 'Cliente', empleado: 'Empleado', personal: 'Personal',
  proveedor: 'Proveedor', servicio: 'Servicio', otro: 'Otro',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ver = url.searchParams.get('ver') ?? '';
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from('deudas')
    .select(
      'tipo, categoria, contraparte, descripcion, monto_total, saldo, fecha, fecha_vencimiento, estado, proveedores(nombre)'
    )
    .order('estado', { ascending: true })
    .order('fecha', { ascending: false })
    .limit(2000);

  type Row = {
    tipo: string; categoria: string; contraparte: string; descripcion: string | null;
    monto_total: number; saldo: number; fecha: string; fecha_vencimiento: string | null;
    estado: string; proveedores: { nombre: string } | null;
  };
  let filas = (data as unknown as Row[] | null) ?? [];

  filas = filas.filter((d) => {
    if (ver === 'cobrar') return d.tipo === 'por_cobrar' && d.estado === 'pendiente';
    if (ver === 'pagar') return d.tipo === 'por_pagar' && d.estado === 'pendiente';
    if (ver === 'pagadas') return d.estado === 'pagada';
    if (ver === 'vencidas') return d.estado === 'pendiente' && !!d.fecha_vencimiento && d.fecha_vencimiento < hoy;
    return true;
  });
  if (q) {
    filas = filas.filter(
      (d) => d.contraparte.toLowerCase().includes(q) || (d.descripcion ?? '').toLowerCase().includes(q)
    );
  }

  const rows: Cell[][] = [];
  rows.push(['Deudas', new Date().toLocaleString('es-CL')]);
  rows.push([]);
  rows.push(['Fecha', 'Nombre', 'Tipo', 'Categoría', 'Proveedor', 'Descripción', 'Monto total', 'Abonado', 'Saldo', 'Vence', 'Estado']);
  for (const d of filas) {
    const abonado = n(d.monto_total) - n(d.saldo);
    rows.push([
      fmtFecha(d.fecha),
      d.contraparte,
      TIPO_LABEL[d.tipo] ?? d.tipo,
      CAT_LABEL[d.categoria] ?? d.categoria,
      d.proveedores?.nombre ?? '',
      d.descripcion ?? '',
      n(d.monto_total),
      abonado,
      n(d.saldo),
      d.fecha_vencimiento ? fmtFecha(d.fecha_vencimiento) : '',
      d.estado === 'pagada' ? 'Pagada' : 'Pendiente',
    ]);
  }

  // Totales al pie (solo pendientes cuentan como saldo vivo).
  const pend = filas.filter((d) => d.estado === 'pendiente');
  const totCobrar = pend.filter((d) => d.tipo === 'por_cobrar').reduce((s, d) => s + n(d.saldo), 0);
  const totPagar = pend.filter((d) => d.tipo === 'por_pagar').reduce((s, d) => s + n(d.saldo), 0);
  rows.push([]);
  rows.push(['Saldo por cobrar (pendiente)', totCobrar]);
  rows.push(['Saldo por pagar (pendiente)', totPagar]);

  return csvResponse(`deudas${ver ? '-' + ver : ''}.csv`, toCsv(rows));
}
