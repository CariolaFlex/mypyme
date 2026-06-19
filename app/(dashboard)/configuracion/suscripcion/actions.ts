'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { flowConfigurado, crearCustomer, registrarTarjeta, cancelarSubscription } from '@/lib/flow/client';
import { PLANES, enrollHabilitado, type PlanKey } from '@/lib/flow/subscription';

const back = (qs: string) => redirect(`/configuracion/suscripcion?${qs}`);

/**
 * Inicia la suscripción: asegura el Customer en Flow, guarda el plan elegido,
 * y redirige al usuario a la página PCI de Flow para inscribir su tarjeta.
 * Doble candado: requiere credenciales (flowConfigurado) Y el flag de enroll.
 * NO realiza el cobro aquí; eso ocurre tras volver de Flow (ver /retorno).
 */
export async function iniciarSuscripcion(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const empresaId = claims?.empresa_id as string | undefined;
  if (!empresaId) redirect('/onboarding');
  if (claims?.user_rol !== 'admin') back('error=' + encodeURIComponent('Solo un administrador puede suscribir'));
  if (!flowConfigurado() || !enrollHabilitado()) back('error=' + encodeURIComponent('El enroll de tarjeta no está habilitado'));

  const planKey = (String(formData.get('plan') ?? 'emprende') as PlanKey);
  const plan = PLANES[planKey] ?? PLANES.emprende;

  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: emp } = await admin
    .from('empresas')
    .select('razon_social, flow_customer_id')
    .eq('id', empresaId)
    .single();

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  let url: string;
  let token: string;
  try {
    let customerId = emp?.flow_customer_id as string | null;
    if (!customerId) {
      const c = await crearCustomer({
        name: emp!.razon_social as string,
        email: user!.email as string,
        externalId: empresaId,
      });
      customerId = c.customerId;
    }
    // Guardar plan elegido y customer.
    await admin.from('empresas').update({ flow_customer_id: customerId, plan: planKey }).eq('id', empresaId);

    const reg = await registrarTarjeta({
      customerId: customerId!,
      urlReturn: `${base}/configuracion/suscripcion/retorno`,
    });
    url = reg.url;
    token = reg.token;
  } catch (e) {
    // Errores de Flow (p.ej. 7001 "Commerce has not automatic charge contract":
    // la cuenta aún no tiene el contrato de cargo automático activado) NO deben
    // tumbar la página: volvemos con un mensaje claro.
    const msg = (e as Error).message || 'No se pudo iniciar la inscripción';
    const amistoso = /automatic charge contract/i.test(msg)
      ? 'Tu cuenta de Flow aún no tiene activado el contrato de Cargo Automático (cobro recurrente). Actívalo con Flow para poder suscribir.'
      : `No se pudo iniciar la inscripción con Flow: ${msg}`;
    back('error=' + encodeURIComponent(amistoso));
    return; // inalcanzable (back lanza redirect), pero deja claro el flujo a TS
  }

  // Persistir token + plan para confirmar al volver (Flow no siempre reenvía el token).
  const jar = await cookies();
  jar.set('flow_reg_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 1800, path: '/' });
  jar.set('flow_reg_plan', plan.flowPlanId, { httpOnly: true, sameSite: 'lax', maxAge: 1800, path: '/' });

  redirect(url); // → página PCI de Flow
}

/**
 * Cancela la suscripción: deja de cobrar en Flow (al final del período pagado) y
 * marca la empresa como cancelada. Solo un admin. No reembolsa.
 */
export async function cancelarSuscripcion() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const empresaId = claims?.empresa_id as string | undefined;
  if (!empresaId) redirect('/onboarding');
  if (claims?.user_rol !== 'admin') back('error=' + encodeURIComponent('Solo un administrador puede cancelar'));

  const admin = createAdminClient();
  const { data: emp } = await admin
    .from('empresas')
    .select('flow_subscription_id')
    .eq('id', empresaId)
    .single();
  const subId = emp?.flow_subscription_id as string | null;
  if (!subId) back('error=' + encodeURIComponent('No tienes una suscripción activa para cancelar'));

  if (flowConfigurado()) {
    try {
      await cancelarSubscription(subId!, true);
    } catch (e) {
      back('error=' + encodeURIComponent(`No se pudo cancelar en Flow: ${(e as Error).message}`));
      return;
    }
  }

  await admin
    .from('empresas')
    .update({ estado_suscripcion: 'cancelada', flow_subscription_id: null })
    .eq('id', empresaId);

  back('ok=' + encodeURIComponent('Suscripción cancelada. No se harán más cobros.'));
}

/**
 * Elimina la cuenta por completo: cancela la suscripción en Flow (si la hay),
 * borra la empresa (cascada: todos sus datos) y todas las cuentas de usuario del
 * tenant, y cierra sesión. Irreversible. Solo un admin, con confirmación escrita.
 */
export async function eliminarCuenta(formData: FormData) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const empresaId = claims?.empresa_id as string | undefined;
  if (!empresaId) redirect('/onboarding');
  if (claims?.user_rol !== 'admin') back('error=' + encodeURIComponent('Solo un administrador puede eliminar la cuenta'));
  if (String(formData.get('confirmar') ?? '').trim() !== 'ELIMINAR') {
    back('error=' + encodeURIComponent('Escribe ELIMINAR para confirmar'));
  }

  const admin = createAdminClient();

  // Cortar cualquier cobro recurrente antes de borrar.
  const { data: emp } = await admin
    .from('empresas')
    .select('flow_subscription_id')
    .eq('id', empresaId)
    .single();
  if (emp?.flow_subscription_id && flowConfigurado()) {
    try {
      await cancelarSubscription(emp.flow_subscription_id as string, false);
    } catch {
      // No bloquear el borrado por un fallo de Flow.
    }
  }

  // Capturar los usuarios del tenant ANTES de borrar la empresa (la cascada
  // elimina sus membresías; las cuentas de auth se borran aparte).
  const { data: miembros } = await admin
    .from('usuarios_empresa')
    .select('usuario_id')
    .eq('empresa_id', empresaId);

  await admin.from('empresas').delete().eq('id', empresaId); // cascada: todos los datos
  for (const m of miembros ?? []) {
    await admin.auth.admin.deleteUser(m.usuario_id as string);
  }

  await supabase.auth.signOut();
  redirect('/');
}
