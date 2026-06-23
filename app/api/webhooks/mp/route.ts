// Webhook de Mercado Pago Point. Igual doctrina que Flow: NUNCA se confía en el
// payload; se consulta el estado REAL del payment intent a la API de MP antes de
// registrar nada. Si MP aprobó → registrar_venta_mp (service_role) registra la
// venta (stock + caja + pagos) de forma idempotente.
//
// Vive bajo /api/webhooks/* → el matcher del middleware lo excluye de la sesión
// (MP llama server-to-server, sin cookies). SEGURO POR DEFECTO: sin credenciales
// MP, responde 200 sin tocar nada.
import { createAdminClient } from '@/lib/supabase/admin';
import { mpConfigurado } from '@/lib/mp/config';
import { getPaymentIntent, estadoCobroDesdeMp } from '@/lib/mp/client';
import { verificarFirmaMp } from '@/lib/mp/signature';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const LIMITE = 30; // peticiones
const VENTANA_MS = 60_000; // por minuto, por IP

export async function POST(request: Request) {
  if (!mpConfigurado()) {
    return new Response('mp no configurado', { status: 200 });
  }

  const rl = rateLimit(`mp-webhook:${clientIp(request)}`, LIMITE, VENTANA_MS);
  if (!rl.ok) {
    return new Response('demasiadas peticiones', {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    });
  }

  const url = new URL(request.url);
  // El id del recurso notificado llega como ?data.id= (o ?id=), o en el body.
  let dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* algunos avisos vienen sin body JSON */
  }
  if (!dataId) {
    const d = body.data as Record<string, unknown> | undefined;
    dataId = String(d?.id ?? body.id ?? '');
  }
  if (!dataId) return new Response('falta id', { status: 400 });

  // Validación de firma (cuando hay secret). El estado autoritativo igual se
  // re-consulta a MP, así que esto es una barrera extra de origen.
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const xSig = request.headers.get('x-signature') ?? '';
    const xReq = request.headers.get('x-request-id') ?? '';
    if (!verificarFirmaMp(dataId, xReq, xSig, secret)) {
      return new Response('firma inválida', { status: 401 });
    }
  }

  const admin = createAdminClient();

  // El recurso notificado es el payment intent → ubicamos el cobro.
  const { data: cobro } = await admin
    .from('mp_cobros')
    .select('id, empresa_id, payment_intent_id, estado')
    .eq('payment_intent_id', dataId)
    .maybeSingle();
  if (!cobro) return new Response('OK', { status: 200 }); // aviso de un intent que no es nuestro
  if (cobro.estado === 'approved') return new Response('OK', { status: 200 }); // ya procesado

  // Segunda fase: estado real del intent.
  let estado: 'pending' | 'approved' | 'rejected' | 'canceled';
  let raw: Record<string, unknown>;
  try {
    const intent = await getPaymentIntent(cobro.empresa_id, cobro.payment_intent_id!);
    estado = estadoCobroDesdeMp(intent.estado);
    raw = intent.raw;
  } catch {
    return new Response('error consultando MP', { status: 502 });
  }

  if (estado === 'approved') {
    try {
      await admin.from('mp_cobros').update({ raw }).eq('id', cobro.id);
      const { error } = await admin.rpc('registrar_venta_mp', { p_cobro_id: cobro.id });
      if (error) throw new Error(error.message);
    } catch (e) {
      console.error('registrar_venta_mp falló:', e);
      return new Response('error registrando venta', { status: 500 });
    }
  } else if (estado === 'pending') {
    await admin.from('mp_cobros').update({ raw }).eq('id', cobro.id);
  } else {
    await admin
      .from('mp_cobros')
      .update({ estado, raw, actualizado_en: new Date().toISOString() })
      .eq('id', cobro.id);
  }

  return new Response('OK', { status: 200 });
}
