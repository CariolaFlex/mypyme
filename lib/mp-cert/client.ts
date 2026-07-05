// Cliente de Checkout Pro para el desafío de certificación personal de Andrés en el
// <dev>program de Mercado Pago. NO es parte del producto Gestionala/mypyme: es un
// checkout de prueba aislado (ver docs/13-mercadopago-certificacion-partners.md §4 Fase 1).
// Usa credenciales de prueba propias (MP_CERT_*), separadas de MP_CLIENT_ID/SECRET de
// Point. Se elimina o se deja inerte una vez aprobada la certificación.
const MP_API = 'https://api.mercadopago.com';

export function mpCertConfigurado(): boolean {
  return !!process.env.MP_CERT_ACCESS_TOKEN;
}

function accessToken(): string {
  const token = process.env.MP_CERT_ACCESS_TOKEN;
  if (!token) throw new Error('MP_CERT_ACCESS_TOKEN no configurado');
  return token;
}

export type MpCertPreferencia = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

/** Crea la preferencia de pago del producto de prueba del desafío Checkout Pro. */
export async function crearPreferenciaCert(
  siteUrl: string,
  externalReference: string
): Promise<MpCertPreferencia> {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      // TODO(confirmar etapa 4 "Configura tu integración"): el desafío puede pedir el
      // Integrator ID en un header propio (p. ej. X-Integrator-Id o X-Meli-Session-Id) o
      // como atributo de la preferencia. No inventar el mecanismo hasta ver la etapa 4.
    },
    body: JSON.stringify({
      items: [
        {
          title: 'Producto de prueba — certificación Checkout Pro',
          quantity: 1,
          unit_price: 2000,
          currency_id: 'CLP',
        },
      ],
      external_reference: externalReference,
      back_urls: {
        success: `${siteUrl}/mp-cert-checkout-pro/retorno?status=success`,
        failure: `${siteUrl}/mp-cert-checkout-pro/retorno?status=failure`,
        pending: `${siteUrl}/mp-cert-checkout-pro/retorno?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/webhooks/mp-cert`,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data?.message as string) || `MP preferencia HTTP ${res.status}`);
  }
  return {
    id: String(data.id ?? ''),
    init_point: String(data.init_point ?? ''),
    sandbox_init_point: String(data.sandbox_init_point ?? ''),
  };
}

/** Consulta un pago por ID (usado por el webhook tras recibir la notificación). */
export async function obtenerPagoCert(paymentId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data?.message as string) || `MP pago HTTP ${res.status}`);
  }
  return data;
}
