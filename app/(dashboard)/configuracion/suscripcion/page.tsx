import { CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { clp, fmtFecha } from '@/lib/reportes';
import {
  PLANES, diasRestantesTrial, enrollHabilitado, enforcementActivo, tieneAcceso, type PlanKey,
} from '@/lib/flow/subscription';
import { flowConfigurado } from '@/lib/flow/client';
import { iniciarSuscripcion } from './actions';

export const dynamic = 'force-dynamic';

// Banner contextual según estado: tono + mensaje accionable.
type Tono = 'ok' | 'warn' | 'bad';
const TONO: Record<Tono, { wrap: string; icon: typeof CheckCircle2 }> = {
  ok: { wrap: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
  warn: { wrap: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', icon: Clock },
  bad: { wrap: 'border-destructive/30 bg-destructive/10 text-destructive', icon: AlertTriangle },
};

function bannerEstado(estado: string, dias: number | null): { tono: Tono; titulo: string; detalle: string } {
  switch (estado) {
    case 'activa':
      return { tono: 'ok', titulo: 'Suscripción activa', detalle: 'Los cargos se realizan automáticamente cada mes.' };
    case 'morosa':
      return { tono: 'bad', titulo: 'Pago pendiente', detalle: 'Tu último cobro no se pudo procesar. Reactiva para no perder el acceso.' };
    case 'cancelada':
      return { tono: 'bad', titulo: 'Suscripción cancelada', detalle: 'Reactívala cuando quieras para volver a usar la app.' };
    case 'suspendida':
      return { tono: 'bad', titulo: 'Suscripción suspendida', detalle: 'Contáctanos o reactiva para restablecer el servicio.' };
    case 'trial':
    default:
      if (dias !== null && dias < 0) {
        return { tono: 'bad', titulo: 'Período de prueba vencido', detalle: `Terminó hace ${-dias} día(s). Suscríbete para seguir usando mypyme.` };
      }
      if (dias !== null && dias <= 3) {
        return { tono: 'warn', titulo: 'Tu prueba termina pronto', detalle: `Quedan ${dias} día(s). Suscríbete para no interrumpir el servicio.` };
      }
      return { tono: 'ok', titulo: 'Período de prueba', detalle: dias !== null ? `Disfruta mypyme. Quedan ${dias} día(s) de prueba.` : 'Disfruta tu período de prueba.' };
  }
}

const ESTADO_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  trial: { label: 'Período de prueba', variant: 'secondary' },
  activa: { label: 'Activa', variant: 'default' },
  morosa: { label: 'Pago pendiente', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
  suspendida: { label: 'Suspendida', variant: 'destructive' },
};

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: empresa } = await supabase
    .from('empresas')
    .select('razon_social, plan, estado_suscripcion, trial_termina_en')
    .single();

  const estado = empresa?.estado_suscripcion ?? 'trial';
  const planKey = (empresa?.plan as PlanKey) ?? 'emprende';
  const plan = PLANES[planKey] ?? PLANES.emprende;
  const dias = diasRestantesTrial(empresa?.trial_termina_en ?? null);
  const est = ESTADO_LABEL[estado] ?? ESTADO_LABEL.trial;
  const configurado = flowConfigurado();
  const enrollOn = enrollHabilitado();
  const banner = bannerEstado(estado, dias);
  const TonoIcon = TONO[banner.tono].icon;
  const conAcceso = tieneAcceso(estado, empresa?.trial_termina_en ?? null);
  const enforce = enforcementActivo();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suscripción</h1>
        <p className="text-sm text-muted-foreground">Tu plan y estado de pago.</p>
      </div>

      {/* Banner contextual según estado */}
      <div className={`flex items-start gap-3 rounded-lg border p-4 ${TONO[banner.tono].wrap}`}>
        <TonoIcon className="mt-0.5 size-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">{banner.titulo}</p>
          <p className="opacity-90">{banner.detalle}</p>
        </div>
      </div>

      {ok && (
        <p className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
          {ok}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Estado</span>
            <Badge variant={est.variant}>{est.label}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">
              {plan.nombre} · {clp.format(plan.precioMensual)}/mes
            </span>
          </div>
          {estado === 'trial' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prueba termina</span>
              <span className="font-medium">
                {fmtFecha(empresa?.trial_termina_en ?? null)}
                {dias !== null && (
                  <span className={dias < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {' '}· {dias < 0 ? `vencida hace ${-dias} día(s)` : `quedan ${dias} día(s)`}
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-muted-foreground">Acceso a la app</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              {conAcceso ? (
                <><CheckCircle2 className="size-4 text-emerald-600" /> Habilitado</>
              ) : enforce ? (
                <><XCircle className="size-4 text-destructive" /> Bloqueado</>
              ) : (
                <><CheckCircle2 className="size-4 text-amber-600" /> Habilitado (sin restricción)</>
              )}
            </span>
          </div>
          {!enforce && !conAcceso && (
            <p className="text-xs text-muted-foreground">
              La restricción de acceso por suscripción aún no está activa, así que puedes seguir
              usando la app con normalidad.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Método de pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {!configurado && (
            <p>
              La cobranza automática (Flow.cl) aún no está conectada en este entorno. Mientras
              tanto tu cuenta funciona con normalidad en período de prueba. No se realizará ningún
              cargo.
            </p>
          )}
          {configurado && !enrollOn && (
            <p>
              Conexión de pagos lista, pero la inscripción de tarjeta está desactivada
              (sin cargos). Se habilita cuando definas el plan a cobrar.
            </p>
          )}
          {configurado && enrollOn && estado !== 'activa' && (
            <form action={iniciarSuscripcion} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="plan" className="text-foreground">Plan a suscribir</label>
                <select
                  id="plan"
                  name="plan"
                  defaultValue={planKey}
                  className="block rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs"
                >
                  {(Object.keys(PLANES) as PlanKey[]).map((k) => (
                    <option key={k} value={k}>
                      {PLANES[k].nombre} — {clp.format(PLANES[k].precioMensual)}/mes
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Inscribir tarjeta y suscribirme</Button>
            </form>
          )}
          {configurado && enrollOn && estado === 'activa' && (
            <p className="text-emerald-700">Suscripción activa. Los cargos se realizan automáticamente cada mes.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(PLANES) as PlanKey[]).map((k) => {
          const p = PLANES[k];
          const actual = k === planKey;
          return (
            <Card key={k} className={actual ? 'border-primary/50' : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{p.nombre}</span>
                  {actual && <Badge variant="secondary">Tu plan</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{clp.format(p.precioMensual)}</div>
                <p className="text-xs text-muted-foreground">por mes</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
