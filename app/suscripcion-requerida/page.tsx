import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logout } from '@/app/(auth)/actions';
import { clp } from '@/lib/reportes';
import {
  PLANES, tieneAcceso, enforcementActivo, diasRestantesTrial, type PlanKey,
} from '@/lib/flow/subscription';

export const dynamic = 'force-dynamic';

const ESTADO_TXT: Record<string, string> = {
  trial: 'tu período de prueba terminó',
  morosa: 'hay un pago pendiente',
  cancelada: 'tu suscripción fue cancelada',
  suspendida: 'tu suscripción está suspendida',
};

export default async function SuscripcionRequeridaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;

  // Sin sesión/onboarding → fuera (los gates normales se encargan).
  if (!claims?.empresa_id) redirect('/login');
  const esAdmin = claims?.user_rol === 'admin';

  const { data: empresa } = await supabase
    .from('empresas')
    .select('razon_social, plan, estado_suscripcion, trial_termina_en')
    .single();

  const estado = empresa?.estado_suscripcion ?? 'trial';
  const trial = empresa?.trial_termina_en ?? null;

  // Si recupera el acceso (o el enforcement se apagó), no tiene nada que hacer acá.
  if (!enforcementActivo() || tieneAcceso(estado, trial)) redirect('/');

  const planKey = (empresa?.plan as PlanKey) ?? 'emprende';
  const plan = PLANES[planKey] ?? PLANES.emprende;
  const dias = diasRestantesTrial(trial);
  const motivo = ESTADO_TXT[estado] ?? 'tu suscripción no está activa';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 size-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-14 rounded-2xl shadow-lg shadow-primary/25" />
          <h1 className="text-xl font-bold tracking-tight">Gestionala</h1>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardContent className="space-y-4 pt-6 text-sm">
            <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Tu acceso está pausado</p>
                <p className="text-amber-700/90 dark:text-amber-300/90">
                  Para <strong>{empresa?.razon_social ?? 'tu negocio'}</strong>, {motivo}
                  {estado === 'trial' && dias !== null && dias < 0 && ` hace ${-dias} día(s)`}.
                </p>
              </div>
            </div>

            <p className="text-muted-foreground">
              Reactiva tu suscripción para volver a usar el punto de venta, la caja y los reportes.
              Tus datos están a salvo y te esperan.
            </p>

            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan {plan.nombre}</span>
                <span className="font-semibold">{clp.format(plan.precioMensual)}/mes</span>
              </div>
            </div>

            {esAdmin ? (
              <Link
                href="/configuracion/suscripcion"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Reactivar mi suscripción
              </Link>
            ) : (
              <p className="rounded-md border border-input bg-transparent p-3 text-muted-foreground">
                Contacta al administrador de tu negocio para reactivar la suscripción.
              </p>
            )}

            <form action={logout}>
              <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
                Cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
