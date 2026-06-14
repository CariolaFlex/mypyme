import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { clp, fmtFecha } from '@/lib/reportes';
import { PLANES, diasRestantesTrial, type PlanKey } from '@/lib/flow/subscription';
import { flowConfigurado } from '@/lib/flow/client';

export const dynamic = 'force-dynamic';

const ESTADO_LABEL: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  trial: { label: 'Período de prueba', variant: 'secondary' },
  activa: { label: 'Activa', variant: 'default' },
  morosa: { label: 'Pago pendiente', variant: 'destructive' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
  suspendida: { label: 'Suspendida', variant: 'destructive' },
};

export default async function SuscripcionPage() {
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suscripción</h1>
        <p className="text-sm text-muted-foreground">Tu plan y estado de pago.</p>
      </div>

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Método de pago</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {configurado ? (
            <p>
              Conexión de pagos activa. Pronto podrás inscribir tu tarjeta aquí para la
              suscripción mensual automática.
            </p>
          ) : (
            <p>
              La cobranza automática (Flow.cl) aún no está conectada en este entorno. Mientras
              tanto tu cuenta funciona con normalidad en período de prueba. No se realizará ningún
              cargo.
            </p>
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
