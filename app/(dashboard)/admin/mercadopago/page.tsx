import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

/**
 * Panel CROSS-TENANT del dueño de la plataforma (Fase 2 inc. 2 del plan MP):
 * TPV por comerciante, comisión estimada (% configurable, para conciliar el
 * revenue share del Partners Program) y estado de conexiones/terminales.
 *
 * Acceso: SOLO emails en PLATFORM_ADMIN_EMAILS (env, separados por coma).
 * Cualquier otro usuario ve un 404 — la página no existe para los tenants.
 * Lee con service_role (bypass RLS): por eso el gate es ANTES de toda query.
 */

type CobroRow = { empresa_id: string; monto: number; estado: string; creado_en: string };
type ConexionRow = { empresa_id: string; estado: string; actualizado_en: string };
type DeviceRow = { empresa_id: string; nombre: string | null; estado: string };
type EmpresaRow = { id: string; razon_social: string; rut: string };

/** Ventana temporal del reporte (fuera del render: react-hooks/purity). */
function ventanaReporte() {
  const ahora = new Date();
  const inicioMes = new Date(ahora);
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  return { desde90: new Date(ahora.getTime() - 90 * 86_400_000).toISOString(), inicioMes };
}

function esAdminPlataforma(email: string | undefined): boolean {
  if (!email) return false;
  const lista = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}

export default async function AdminMercadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ pct?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdminPlataforma(user?.email)) notFound();

  const { pct } = await searchParams;
  // % de revenue share estimado: query param > env > 0. Solo para PROYECTAR;
  // la cifra real la define el acuerdo con MP y se concilia con su reporte.
  const pctNum = Math.max(0, Math.min(10, Number(pct ?? process.env.MP_REVSHARE_PCT ?? 0) || 0));

  const admin = createAdminClient();
  const { desde90, inicioMes } = ventanaReporte();
  const [{ data: empresas }, { data: cobros }, { data: conexiones }, { data: devices }] =
    await Promise.all([
      admin.from('empresas').select('id, razon_social, rut'),
      admin
        .from('mp_cobros')
        .select('empresa_id, monto, estado, creado_en')
        .eq('estado', 'approved')
        .gte('creado_en', desde90),
      admin.from('mp_conexiones').select('empresa_id, estado, actualizado_en'),
      admin.from('mp_dispositivos').select('empresa_id, nombre, estado'),
    ]);

  const empresasMap = new Map((empresas as EmpresaRow[] | null)?.map((e) => [e.id, e]) ?? []);

  // Agregación por comerciante (los volúmenes de 90d caben de sobra en memoria).
  const porEmpresa = new Map<
    string,
    { tpvMes: number; tpv90: number; cobros: number; devices: number; conexion: string }
  >();
  const ensure = (id: string) => {
    let e = porEmpresa.get(id);
    if (!e) {
      e = { tpvMes: 0, tpv90: 0, cobros: 0, devices: 0, conexion: '—' };
      porEmpresa.set(id, e);
    }
    return e;
  };
  for (const c of (cobros as CobroRow[] | null) ?? []) {
    const e = ensure(c.empresa_id);
    const monto = Number(c.monto);
    e.tpv90 += monto;
    e.cobros++;
    if (new Date(c.creado_en) >= inicioMes) e.tpvMes += monto;
  }
  for (const cx of (conexiones as ConexionRow[] | null) ?? []) ensure(cx.empresa_id).conexion = cx.estado;
  for (const d of (devices as DeviceRow[] | null) ?? []) {
    if (d.estado === 'activo') ensure(d.empresa_id).devices++;
  }

  const filas = [...porEmpresa.entries()]
    .map(([id, v]) => ({ id, ...v, empresa: empresasMap.get(id) }))
    .sort((a, b) => b.tpv90 - a.tpv90);
  const tpvMesTotal = filas.reduce((s, f) => s + f.tpvMes, 0);
  const tpv90Total = filas.reduce((s, f) => s + f.tpv90, 0);
  const comisionMes = Math.round(tpvMesTotal * (pctNum / 100));
  const conectadas = filas.filter((f) => f.conexion === 'conectada').length;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        icon={ShieldCheck}
        title="Admin plataforma — Mercado Pago"
        description="TPV por comerciante y comisión estimada del revenue share. Solo visible para administradores de Gestionala."
      />

      {/* KPIs globales */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-muted-foreground">TPV mes actual</p>
          <p className="text-xl font-semibold">{clp.format(tpvMesTotal)}</p>
        </div>
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-muted-foreground">TPV últimos 90 días</p>
          <p className="text-xl font-semibold">{clp.format(tpv90Total)}</p>
        </div>
        <div className="rounded-lg border bg-primary/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Comisión estimada mes ({pctNum}%)</p>
          <p className="text-xl font-semibold text-primary">{clp.format(comisionMes)}</p>
        </div>
        <div className="rounded-lg border px-4 py-3">
          <p className="text-xs text-muted-foreground">Comercios conectados</p>
          <p className="text-xl font-semibold">{conectadas}</p>
        </div>
      </div>

      {/* % de comisión configurable (GET → queda en la URL, compartible) */}
      <form className="flex items-end gap-2" method="get">
        <div className="space-y-1.5">
          <Label htmlFor="pct">% revenue share (proyección)</Label>
          <Input id="pct" name="pct" type="number" step="0.01" min="0" max="10" defaultValue={pctNum} className="w-36" />
        </div>
        <Button type="submit" variant="outline">Recalcular</Button>
        <p className="pb-2 text-xs text-muted-foreground">
          La cifra real la define el acuerdo con MP; esto es para proyectar y conciliar.
        </p>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Comerciante</TableHead>
            <TableHead>Conexión</TableHead>
            <TableHead className="text-right">Terminales</TableHead>
            <TableHead className="text-right">Cobros 90d</TableHead>
            <TableHead className="text-right">TPV mes</TableHead>
            <TableHead className="text-right">TPV 90d</TableHead>
            <TableHead className="text-right">Comisión mes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.length ? (
            filas.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <span className="block font-medium">{f.empresa?.razon_social ?? f.id.slice(0, 8)}</span>
                  <span className="block text-xs text-muted-foreground">{f.empresa?.rut ?? ''}</span>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium ${
                      f.conexion === 'conectada'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : f.conexion === '—'
                          ? 'text-muted-foreground'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {f.conexion}
                  </span>
                </TableCell>
                <TableCell className="text-right">{f.devices}</TableCell>
                <TableCell className="text-right">{f.cobros}</TableCell>
                <TableCell className="text-right">{clp.format(f.tpvMes)}</TableCell>
                <TableCell className="text-right">{clp.format(f.tpv90)}</TableCell>
                <TableCell className="text-right font-medium">
                  {clp.format(Math.round(f.tpvMes * (pctNum / 100)))}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                Aún no hay comercios con actividad Mercado Pago.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Datos: cobros <strong>aprobados</strong> de los últimos 90 días en todas las empresas
        (lectura service-role, gateada por PLATFORM_ADMIN_EMAILS).
      </p>
    </div>
  );
}
