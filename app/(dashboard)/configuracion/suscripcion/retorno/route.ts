// Retorno desde la página PCI de Flow tras inscribir la tarjeta.
// Confirma el registro con el token guardado y crea la suscripción al plan.
// Gated por credenciales; si algo falla, vuelve a /suscripcion con el error.
//
// NOTA: este camino aún NO fue probado contra la API real (el enroll está
// detrás de FLOW_ENROLL_ENABLED). Los nombres de campos de respuesta de Flow
// (status del registro) se confirmarán al habilitarlo.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { flowConfigurado, getRegistroTarjeta, crearSubscription } from '@/lib/flow/client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const volver = (qs: string) => NextResponse.redirect(`${base}/configuracion/suscripcion?${qs}`);

  if (!flowConfigurado()) return volver('error=' + encodeURIComponent('Flow no configurado'));

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const empresaId = claims?.empresa_id as string | undefined;
  if (!empresaId) return NextResponse.redirect(`${base}/login`);

  const jar = await cookies();
  const token = jar.get('flow_reg_token')?.value;
  const planId = jar.get('flow_reg_plan')?.value;
  jar.delete('flow_reg_token');
  jar.delete('flow_reg_plan');
  if (!token || !planId) return volver('error=' + encodeURIComponent('No se encontró el registro en curso'));

  try {
    const reg = await getRegistroTarjeta(token);
    const okReg = reg.status === 1 || reg.status === '1' || !!reg.creditCardType;
    if (!okReg) return volver('error=' + encodeURIComponent('No se pudo inscribir la tarjeta'));

    const admin = createAdminClient();
    const { data: emp } = await admin
      .from('empresas')
      .select('flow_customer_id')
      .eq('id', empresaId)
      .single();
    const customerId = emp?.flow_customer_id as string | undefined;
    if (!customerId) return volver('error=' + encodeURIComponent('Cliente Flow no encontrado'));

    const sub = await crearSubscription({ planId, customerId });
    await admin
      .from('empresas')
      .update({ flow_subscription_id: sub.subscriptionId, estado_suscripcion: 'activa' })
      .eq('id', empresaId);

    return volver('ok=' + encodeURIComponent('Suscripción activada'));
  } catch (e) {
    return volver('error=' + encodeURIComponent((e as Error).message));
  }
}
