import { NextRequest, NextResponse } from 'next/server';
import { mpCertConfigurado, obtenerPagoCert } from '@/lib/mp-cert/client';

// Webhook del desafío de certificación Checkout Pro. Responde 200/201 dentro de los
// 22s que exige MP (doc: docs/checkout-pro/payment-notifications), y consulta el pago
// para dejar registro en el log del servidor. No escribe en la base de datos de
// Gestionala: este endpoint no es parte del producto (ver docs/13-...md).
export async function POST(req: NextRequest) {
  if (!mpCertConfigurado()) {
    return NextResponse.json({ error: 'MP_CERT_ACCESS_TOKEN no configurado' }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tipo = (body.type ?? body.topic) as string | undefined;
  const dataId = (body.data as { id?: string } | undefined)?.id ?? (body as { id?: string }).id;

  console.log('[mp-cert webhook] notificación recibida', { tipo, dataId, body });

  if (tipo === 'payment' && dataId) {
    try {
      const pago = await obtenerPagoCert(String(dataId));
      console.log('[mp-cert webhook] pago consultado', {
        id: pago.id,
        status: pago.status,
        external_reference: pago.external_reference,
      });
    } catch (err) {
      console.error('[mp-cert webhook] error consultando el pago', err);
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
