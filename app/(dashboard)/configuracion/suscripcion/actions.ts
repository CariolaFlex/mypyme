'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { flowConfigurado, crearCustomer, registrarTarjeta } from '@/lib/flow/client';
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

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { url, token } = await registrarTarjeta({
    customerId: customerId!,
    urlReturn: `${base}/configuracion/suscripcion/retorno`,
  });

  // Persistir token + plan para confirmar al volver (Flow no siempre reenvía el token).
  const jar = await cookies();
  jar.set('flow_reg_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 1800, path: '/' });
  jar.set('flow_reg_plan', plan.flowPlanId, { httpOnly: true, sameSite: 'lax', maxAge: 1800, path: '/' });

  redirect(url); // → página PCI de Flow
}
