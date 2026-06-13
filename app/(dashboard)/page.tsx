import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, inicioDiaSantiago, inicioHaceDias, inicioMesSantiago } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type Resumen = {
  num_ventas: number;
  total: number;
  neto: number;
  iva: number;
  ticket_promedio: number;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const ahora = new Date();
  const hoy = inicioDiaSantiago(ahora).toISOString();
  const semana = inicioHaceDias(6, ahora).toISOString();
  const mes = inicioMesSantiago(ahora).toISOString();
  const hasta = ahora.toISOString();

  const [
    { data: empresa },
    { data: rHoy },
    { data: rSemana },
    { data: rMes },
    { data: top },
    { data: productos },
    { data: stockRows },
  ] = await Promise.all([
    supabase.from('empresas').select('razon_social, rut, plan, estado_suscripcion').single(),
    supabase.rpc('reporte_ventas_resumen', { p_desde: hoy, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_resumen', { p_desde: semana, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_resumen', { p_desde: mes, p_hasta: hasta }),
    supabase.rpc('reporte_top_productos', { p_desde: mes, p_hasta: hasta, p_limite: 5 }),
    supabase.from('productos').select('id, stock_minimo').eq('activo', true),
    supabase.from('vw_stock_actual').select('producto_id, stock'),
  ]);

  const hoyR = (rHoy?.[0] as Resumen | undefined) ?? null;
  const semanaR = (rSemana?.[0] as Resumen | undefined) ?? null;
  const mesR = (rMes?.[0] as Resumen | undefined) ?? null;

  // Stock bajo (mismo cálculo que el sidebar)
  const stockPorProducto = new Map<string, number>();
  for (const r of stockRows ?? []) {
    stockPorProducto.set(r.producto_id, (stockPorProducto.get(r.producto_id) ?? 0) + Number(r.stock));
  }
  const stockBajo = (productos ?? []).filter(
    (p) => p.stock_minimo != null && (stockPorProducto.get(p.id) ?? 0) <= Number(p.stock_minimo)
  ).length;

  const periodos: { label: string; r: Resumen | null }[] = [
    { label: 'Hoy', r: hoyR },
    { label: 'Últimos 7 días', r: semanaR },
    { label: 'Este mes', r: mesR },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{empresa?.razon_social ?? 'Tu negocio'}</h1>
          <p className="text-sm text-muted-foreground">RUT {empresa?.rut}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Plan {empresa?.plan}</Badge>
          <Badge>{empresa?.estado_suscripcion}</Badge>
        </div>
      </div>

      {/* KPIs por período */}
      <div className="grid gap-4 sm:grid-cols-3">
        {periodos.map(({ label, r }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clp.format(Number(r?.total ?? 0))}</div>
              <p className="text-xs text-muted-foreground">
                {Number(r?.num_ventas ?? 0)} {Number(r?.num_ventas) === 1 ? 'venta' : 'ventas'}
                {Number(r?.num_ventas ?? 0) > 0 && (
                  <> · ticket {clp.format(Number(r?.ticket_promedio ?? 0))}</>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* IVA del mes + stock bajo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA débito del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clp.format(Number(mesR?.iva ?? 0))}</div>
            <p className="text-xs text-muted-foreground">
              Neto {clp.format(Number(mesR?.neto ?? 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockBajo}</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/inventario/stock" className="underline-offset-2 hover:underline">
                {stockBajo > 0 ? 'productos por reponer' : 'todo en orden'}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reportes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <Link href="/reportes/ventas" className="underline-offset-2 hover:underline">Reporte de ventas →</Link>
            <Link href="/reportes/iva" className="underline-offset-2 hover:underline">Reporte de IVA (F29) →</Link>
          </CardContent>
        </Card>
      </div>

      {/* Top productos del mes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top productos del mes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top?.length ? (
                top.map((t: { producto_id: string; nombre: string; cantidad: number; total: number }) => (
                  <TableRow key={t.producto_id}>
                    <TableCell>{t.nombre}</TableCell>
                    <TableCell className="text-right">{Number(t.cantidad)}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(t.total))}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                    Aún no hay ventas este mes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
