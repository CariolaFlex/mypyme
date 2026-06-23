import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { clp, RANGOS, desdePara, normalizarRango } from '@/lib/reportes';
import { VentasPorDiaChart } from '@/components/charts/dynamic';

export const dynamic = 'force-dynamic';

type Resumen = {
  num_cobros: number;
  num_aprobados: number;
  num_rechazados: number;
  num_cancelados: number;
  total_aprobado: number;
  ticket_promedio: number;
};

const ESTADO: Record<string, { label: string; clase: string }> = {
  approved: { label: 'Aprobado', clase: 'text-emerald-600' },
  rejected: { label: 'Rechazado', clase: 'text-destructive' },
  canceled: { label: 'Cancelado', clase: 'text-muted-foreground' },
  pending: { label: 'Pendiente', clase: 'text-amber-600' },
};

const fmtFechaHora = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short',
});

export default async function ReporteMercadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ rango?: string }>;
}) {
  const { rango: rangoRaw } = await searchParams;
  const rango = normalizarRango(rangoRaw);

  const supabase = await createClient();
  const ahora = new Date();
  const desde = desdePara(rango, ahora).toISOString();
  const hasta = ahora.toISOString();

  const [
    { data: resumen },
    { data: porDia },
    { data: conx },
    { data: dispositivos },
    { data: recientes },
  ] = await Promise.all([
    supabase.rpc('reporte_mp_resumen', { p_desde: desde, p_hasta: hasta }),
    supabase.rpc('reporte_mp_por_dia', { p_desde: desde, p_hasta: hasta }),
    supabase.from('mp_conexiones').select('estado').maybeSingle(),
    supabase.from('mp_dispositivos').select('device_id, modo, estado').order('creado_en'),
    supabase
      .from('mp_cobros')
      .select('id, venta_id, monto, estado, creado_en')
      .order('creado_en', { ascending: false })
      .limit(20),
  ]);

  const R = (resumen?.[0] as Resumen | undefined) ?? null;
  const conectada = conx?.estado === 'conectada';
  const serie = (porDia ?? []).map((d: { dia: string; num: number; total: number }) => ({
    dia: d.dia,
    num_ventas: Number(d.num),
    total: Number(d.total),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes Mercado Pago</h1>
        <p className="text-sm text-muted-foreground">
          Tus cobros con tarjeta a través de la maquinita Mercado Pago Point.
        </p>
      </div>

      {!conectada && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Todavía no tienes Mercado Pago conectado.{' '}
            <Link href="/configuracion/mercadopago" className="text-primary underline underline-offset-2">
              Conéctalo aquí
            </Link>{' '}
            para cobrar con tarjeta desde el POS.
          </CardContent>
        </Card>
      )}

      {conectada && (
        <>
          {/* Selector de rango */}
          <div className="flex flex-wrap gap-2">
            {RANGOS.map((r) => (
              <Link
                key={r.key}
                href={`/reportes/mercadopago?rango=${r.key}`}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  r.key === rango
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                {r.label}
              </Link>
            ))}
          </div>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Kpi label="Total cobrado" value={clp.format(Number(R?.total_aprobado ?? 0))} />
            <Kpi label="Cobros aprobados" value={String(Number(R?.num_aprobados ?? 0))} />
            <Kpi
              label="Rechazados / cancelados"
              value={String(Number(R?.num_rechazados ?? 0) + Number(R?.num_cancelados ?? 0))}
            />
            <Kpi label="Ticket promedio" value={clp.format(Number(R?.ticket_promedio ?? 0))} />
          </div>

          {/* Gráfico por día (reusa el de ventas) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Cobrado por día</CardTitle></CardHeader>
            <CardContent>
              <VentasPorDiaChart data={serie} />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Estado de las terminales */}
            <Card>
              <CardHeader><CardTitle className="text-base">Terminales</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Terminal</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispositivos?.length ? (
                      dispositivos.map((d: { device_id: string; modo: string | null; estado: string }) => (
                        <TableRow key={d.device_id}>
                          <TableCell className="font-medium">{d.device_id}</TableCell>
                          <TableCell>{d.modo ?? '—'}</TableCell>
                          <TableCell className="text-right">
                            <span className={d.estado === 'activo' ? 'text-emerald-600' : 'text-muted-foreground'}>
                              {d.estado === 'activo' ? 'Activa' : 'Inactiva'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <Vacio cols={3} texto="Sin terminales vinculadas." />
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Historial reciente */}
            <Card>
              <CardHeader><CardTitle className="text-base">Cobros recientes</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recientes?.length ? (
                      recientes.map((c: { id: string; monto: number; estado: string; creado_en: string }) => {
                        const e = ESTADO[c.estado] ?? { label: c.estado, clase: '' };
                        return (
                          <TableRow key={c.id}>
                            <TableCell>{fmtFechaHora.format(new Date(c.creado_en))}</TableCell>
                            <TableCell className="text-right tabular-nums">{clp.format(Number(c.monto))}</TableCell>
                            <TableCell className={cn('text-right', e.clase)}>{e.label}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <Vacio cols={3} texto="Aún no hay cobros." />
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Vacio({ cols, texto }: { cols: number; texto: string }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="py-6 text-center text-muted-foreground">
        {texto}
      </TableCell>
    </TableRow>
  );
}
