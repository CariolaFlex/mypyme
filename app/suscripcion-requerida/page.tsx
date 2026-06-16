import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
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
  if (!enforcementActivo() || tieneAcceso(estado, trial)) redirect('/inicio');

  const planKey = (empresa?.plan as PlanKey) ?? 'emprende';
  const plan = PLANES[planKey] ?? PLANES.emprende;
  const dias = diasRestantesTrial(trial);
  const motivo = ESTADO_TXT[estado] ?? 'tu suscripción no está activa';

  return (
    <main className="mesh-bg grid-pattern relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="blob left-[10%] top-[-6rem] size-[26rem]" style={{ background: '#2563eb' }} />
      <div className="blob bottom-[-8rem] right-[-4rem] size-[22rem]" style={{ background: '#0d1b2a', animationDelay: '-7s' }} />

      <div className="relative w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-16 rounded-2xl shadow-xl glow-brand" />
          <h1 className="text-3xl font-black tracking-tight text-grad-brand animate-gradient-x">Gestionala</h1>
        </div>

        <div className="glass-strong space-y-4 rounded-3xl p-6 text-sm shadow-2xl shadow-[#0d1b2a]/10">
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
                className="grad-brand-vivid inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
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
        </div>
      </div>
    </main>
  );
}
