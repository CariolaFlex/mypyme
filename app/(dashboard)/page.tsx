import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sun, CalendarDays, CalendarRange, Receipt, AlertTriangle, BarChart3,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { clp, inicioDiaSantiago, inicioHaceDias, inicioMesSantiago } from '@/lib/reportes';
import { diasRestantesTrial } from '@/lib/flow/subscription';
import { VentasPorDiaChart } from '@/components/charts/dynamic';

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
    { data: porDia7 },
    { data: productos },
    { data: stockRows },
    { count: numVentasTotal },
  ] = await Promise.all([
    supabase.from('empresas').select('razon_social, rut, plan, estado_suscripcion, trial_termina_en').single(),
    supabase.rpc('reporte_ventas_resumen', { p_desde: hoy, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_resumen', { p_desde: semana, p_hasta: hasta }),
    supabase.rpc('reporte_ventas_resumen', { p_desde: mes, p_hasta: hasta }),
    supabase.rpc('reporte_top_productos', { p_desde: mes, p_hasta: hasta, p_limite: 5 }),
    supabase.rpc('reporte_ventas_por_dia', { p_desde: semana, p_hasta: hasta }),
    supabase.from('productos').select('id, stock_minimo').eq('activo', true),
    supabase.from('vw_stock_actual').select('producto_id, stock'),
    supabase.from('ventas').select('id', { count: 'exact', head: true }),
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

  const periodos: { label: string; r: Resumen | null; icon: LucideIcon }[] = [
    { label: 'Hoy', r: hoyR, icon: Sun },
    { label: 'Últimos 7 días', r: semanaR, icon: CalendarDays },
    { label: 'Este mes', r: mesR, icon: CalendarRange },
  ];

  // Onboarding guiado: hitos reales del primer uso. La guía persiste hasta que
  // el negocio cargó su menú Y registró su primera venta, luego desaparece sola.
  const tieneProductos = (productos?.length ?? 0) > 0;
  const tieneVentas = (numVentasTotal ?? 0) > 0;
  const pasosCompletos = 1 + (tieneProductos ? 1 : 0) + (tieneVentas ? 1 : 0);
  const totalPasos = 3;
  const mostrarGuia = pasosCompletos < totalPasos;

  // Aviso de trial por vencer (no bloquea; solo informa).
  const estadoSus = (empresa as { estado_suscripcion?: string; trial_termina_en?: string | null } | null)?.estado_suscripcion;
  const trialTermina = (empresa as { trial_termina_en?: string | null } | null)?.trial_termina_en ?? null;
  const diasTrial = estadoSus === 'trial' ? diasRestantesTrial(trialTermina) : null;
  const avisoTrial = diasTrial !== null && diasTrial <= 3;

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

      {/* Aviso de trial por vencer (informativo, no bloquea) */}
      {avisoTrial && (
        <Link
          href="/configuracion/suscripcion"
          className="block rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 transition-colors hover:bg-amber-500/15"
        >
          {diasTrial! < 0
            ? 'Tu período de prueba venció.'
            : `Tu período de prueba termina en ${diasTrial} día(s).`}{' '}
          <span className="font-medium underline underline-offset-2">Ver suscripción →</span>
        </Link>
      )}

      {/* Onboarding guiado: persiste hasta cargar el menú y hacer la primera venta */}
      {mostrarGuia && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">👋 Bienvenido. Pongamos tu negocio en marcha</CardTitle>
            <CardAction>
              <Badge variant="secondary">{pasosCompletos} de {totalPasos} listos</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {/* Barra de progreso */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(pasosCompletos / totalPasos) * 100}%` }}
              />
            </div>

            <div className="space-y-3">
              <Paso n={1} hecho titulo="Crea tu negocio" detalle="Listo: tu empresa ya está configurada." />
              <Paso
                n={2}
                hecho={tieneProductos}
                titulo="Carga tu menú"
                detalle={
                  tieneProductos
                    ? 'Tu catálogo ya tiene productos. Puedes seguir agregando cuando quieras.'
                    : 'Pega todos tus productos de una vez (nombre, precio, categoría, stock).'
                }
                href="/inventario/importar"
                cta="Importar catálogo →"
              />
              <Paso
                n={3}
                hecho={tieneVentas}
                titulo="Abre la caja y haz tu primera venta"
                detalle={
                  tieneVentas
                    ? '¡Ya registraste tu primera venta! Tu negocio está operando.'
                    : 'Abre tu caja con el monto inicial y empieza a cobrar en el POS.'
                }
                href="/caja"
                cta="Ir a caja →"
              />
            </div>

            <p className="pt-1 text-xs text-muted-foreground">
              ¿Trabajas con más gente? Puedes{' '}
              <Link href="/configuracion/usuarios" className="underline underline-offset-2">
                agregar a tu equipo
              </Link>{' '}
              cuando quieras.
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPIs por período */}
      <div className="grid gap-4 sm:grid-cols-3">
        {periodos.map(({ label, r, icon: Icon }) => (
          <Card key={label} className="transition-shadow duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <CardAction>
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-[18px]" />
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight tabular-nums">{clp.format(Number(r?.total ?? 0))}</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
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
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">IVA débito del mes</CardTitle>
            <CardAction>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="size-[18px]" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight tabular-nums">{clp.format(Number(mesR?.iva ?? 0))}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Neto {clp.format(Number(mesR?.neto ?? 0))}</p>
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock bajo</CardTitle>
            <CardAction>
              <div className={`flex size-9 items-center justify-center rounded-lg ${stockBajo > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'}`}>
                <AlertTriangle className="size-[18px]" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight tabular-nums">{stockBajo}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Link href="/inventario/stock" className="underline-offset-2 hover:underline">
                {stockBajo > 0 ? 'productos por reponer' : 'todo en orden'}
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card className="transition-shadow duration-200 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reportes</CardTitle>
            <CardAction>
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="size-[18px]" />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            <Link href="/reportes/ventas" className="group inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80">
              Reporte de ventas
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/reportes/iva" className="group inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80">
              Reporte de IVA (F29)
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de ventas (7 días) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas — últimos 7 días</CardTitle>
        </CardHeader>
        <CardContent>
          <VentasPorDiaChart data={(porDia7 ?? []) as { dia: string; num_ventas: number; total: number }[]} />
        </CardContent>
      </Card>

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

function Paso({
  n, titulo, detalle, href, cta, hecho,
}: {
  n: number; titulo: string; detalle: string; href?: string; cta?: string; hecho?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          hecho ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
        }`}
      >
        {hecho ? '✓' : n}
      </div>
      <div className="space-y-0.5">
        <div className={`font-medium ${hecho ? 'text-muted-foreground line-through decoration-1' : ''}`}>{titulo}</div>
        <p className="text-muted-foreground">{detalle}</p>
        {href && cta && !hecho && (
          <Link href={href} className="inline-block font-medium text-primary underline-offset-2 hover:underline">
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}
