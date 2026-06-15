// Retorno desde la página PCI de Flow tras inscribir la tarjeta.
// Confirma el registro con el token guardado y crea la suscripción al plan.
// Gated por credenciales; si algo falla, vuelve a /suscripcion con el error.
//
// Campos de respuesta de Flow verificados contra la doc (developers.flow.cl):
//  - customer/getRegisterStatus → status ("1"=éxito), creditCardType,
//    last4CardDigits, cardNumber, issuerBank, customerId.
//  - subscription/create → subscriptionId, status (requiere planId + customerId).
// Sigue sin probarse contra la API real (enroll detrás de FLOW_ENROLL_ENABLED);
// el flujo y los nombres están alineados con la documentación.
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

    // Texto de la tarjeta inscrita para confirmar al usuario (sin datos sensibles).
    const marca = typeof reg.creditCardType === 'string' ? reg.creditCardType : 'Tarjeta';
    const last4 = typeof reg.last4CardDigits === 'string' ? reg.last4CardDigits : '';
    const tarjetaTxt = last4 ? ` · ${marca} ****${last4}` : '';

    const admin = createAdminClient();
    const { data: emp } = await admin
      .from('empresas')
      .select('flow_customer_id, flow_subscription_id')
      .eq('id', empresaId)
      .single();
    const customerId = emp?.flow_customer_id as string | undefined;
    if (!customerId) return volver('error=' + encodeURIComponent('Cliente Flow no encontrado'));

    // Idempotencia: si ya hay suscripción (p.ej. reentrada al /retorno), no creamos
    // otra; solo aseguramos el estado activo y confirmamos.
    if (emp?.flow_subscription_id) {
      await admin.from('empresas').update({ estado_suscripcion: 'activa' }).eq('id', empresaId);
      return volver('ok=' + encodeURIComponent(`Suscripción ya activa${tarjetaTxt}`));
    }

    const sub = await crearSubscription({ planId, customerId });
    await admin
      .from('empresas')
      .update({ flow_subscription_id: sub.subscriptionId, estado_suscripcion: 'activa' })
      .eq('id', empresaId);

    return volver('ok=' + encodeURIComponent(`Suscripción activada${tarjetaTxt}`));
  } catch (e) {
    return volver('error=' + encodeURIComponent((e as Error).message));
  }
}
