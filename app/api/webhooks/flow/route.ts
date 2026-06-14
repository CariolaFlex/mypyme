// Webhook de Flow.cl (notificación de pago). Doble fase obligatoria: NUNCA se
// confía en el payload; se consulta el estado real a Flow antes de actualizar.
//
// SEGURO POR DEFECTO: si Flow no está configurado (sin credenciales), responde
// 200 sin tocar nada — la app funciona idéntica hasta que se conecten las llaves.
import { createAdminClient } from '@/lib/supabase/admin';
import { flowConfigurado, getPaymentStatus } from '@/lib/flow/client';
import { estadoDesdeFlow } from '@/lib/flow/subscription';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!flowConfigurado()) {
    // Aún no configurado: no-op. (Flow reintenta; se procesará al conectar Flow.)
    return new Response('flow no configurado', { status: 200 });
  }

  let token: string | null = null;
  try {
    const body = await request.formData();
    token = (body.get('token') as string | null) ?? null;
  } catch {
    return new Response('payload inválido', { status: 400 });
  }
  if (!token) return new Response('falta token', { status: 400 });

  let status;
  try {
    status = await getPaymentStatus(token); // segunda fase: estado autoritativo
  } catch {
    return new Response('error consultando Flow', { status: 502 });
  }

  const subId = status.subscriptionId || status.commerceOrder;
  if (subId) {
    const admin = createAdminClient();
    await admin
      .from('empresas')
      .update({ estado_suscripcion: estadoDesdeFlow(status.status) })
      .eq('flow_subscription_id', subId);
  }

  return new Response('OK', { status: 200 });
}
