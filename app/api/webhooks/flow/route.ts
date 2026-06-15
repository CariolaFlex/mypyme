// Webhook de Flow.cl (notificación de pago). Doble fase obligatoria: NUNCA se
// confía en el payload; se consulta el estado real a Flow antes de actualizar.
//
// SEGURO POR DEFECTO: si Flow no está configurado (sin credenciales), responde
// 200 sin tocar nada — la app funciona idéntica hasta que se conecten las llaves.
import { createAdminClient } from '@/lib/supabase/admin';
import { flowConfigurado, getPaymentStatus } from '@/lib/flow/client';
import { estadoDesdeFlow } from '@/lib/flow/subscription';
import { enviarBienvenidaSuscripcion } from '@/lib/email/resend';

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
    const nuevoEstado = estadoDesdeFlow(status.status);
    const { data: emp } = await admin
      .from('empresas')
      .update({ estado_suscripcion: nuevoEstado })
      .eq('flow_subscription_id', subId)
      .select('id, razon_social')
      .maybeSingle();

    // Registrar el pago en el historial (idempotente por flow_token).
    if (emp) {
      try {
        await admin.from('pagos_suscripcion').upsert(
          {
            empresa_id: emp.id,
            flow_token: token,
            flow_commerce_order: status.commerceOrder || null,
            flow_subscription_id: status.subscriptionId ?? null,
            monto: status.amount,
            flow_status: status.status,
            estado: nuevoEstado,
            pagado_en: status.paidAt ?? null,
          },
          { onConflict: 'flow_token' }
        );
      } catch (e) {
        console.error('Registro de pago falló (ignorado):', e);
      }
    }

    // Email de bienvenida al activarse (best-effort: no afecta la respuesta).
    if (nuevoEstado === 'activa' && emp) {
      try {
        const { data: miembro } = await admin
          .from('usuarios_empresa')
          .select('usuario_id')
          .eq('empresa_id', emp.id)
          .eq('rol', 'admin')
          .order('creado_en', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (miembro) {
          const { data: u } = await admin.auth.admin.getUserById(miembro.usuario_id);
          if (u?.user?.email) {
            await enviarBienvenidaSuscripcion({ to: u.user.email, nombreNegocio: emp.razon_social });
          }
        }
      } catch (e) {
        console.error('Email bienvenida falló (ignorado):', e);
      }
    }
  }

  return new Response('OK', { status: 200 });
}
