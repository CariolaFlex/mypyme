// Cliente de la Point Integration API de Mercado Pago. Opera con el access_token
// del comerciante (resuelto por tokens.ts). Endpoints verificados contra la doc
// oficial (developers.mercadopago > Point Integration API); el cobro físico se
// confirma con un Point Smart real en modo PDV.
//
// Nota CLP: el peso no tiene decimales → el monto va como entero de pesos. Se
// confirma el campo exacto (amount) contra el device en la prueba de hardware.
import { MP_API } from './config';
import { getAccessTokenValido } from './tokens';

async function mpFetch(
  empresaId: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const token = await getAccessTokenValido(empresaId);
  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((data?.message as string) || `MP ${path} HTTP ${res.status}`);
  }
  return data;
}

export type MpDevice = { id: string; nombre: string; modo: string | null };

/** Lista las terminales Point de la cuenta del comerciante. */
export async function listarDevices(empresaId: string): Promise<MpDevice[]> {
  const data = await mpFetch(empresaId, 'GET', '/point/integration-api/devices');
  const devices = (data.devices ?? []) as Array<Record<string, unknown>>;
  return devices.map((d) => ({
    id: String(d.id ?? ''),
    nombre: String(d.id ?? ''), // MP no da alias; usamos el id como rótulo
    modo: d.operating_mode ? String(d.operating_mode) : null,
  }));
}

export type MpIntent = { id: string; estado: string; raw: Record<string, unknown> };

/** Crea un payment intent sobre el device → la terminal carga el monto. */
export async function crearPaymentIntent(
  empresaId: string,
  deviceId: string,
  montoPesos: number,
  externalReference: string
): Promise<MpIntent> {
  const data = await mpFetch(
    empresaId,
    'POST',
    `/point/integration-api/devices/${deviceId}/payment-intents`,
    {
      amount: Math.round(montoPesos),
      additional_info: { external_reference: externalReference, print_on_terminal: true },
    }
  );
  return { id: String(data.id ?? ''), estado: String(data.state ?? 'pending'), raw: data };
}

/** Estado real de un payment intent (segunda fase del webhook). */
export async function getPaymentIntent(empresaId: string, intentId: string): Promise<MpIntent> {
  const data = await mpFetch(
    empresaId,
    'GET',
    `/point/integration-api/payment-intents/${intentId}`
  );
  return { id: String(data.id ?? intentId), estado: String(data.state ?? ''), raw: data };
}

/** Cancela un payment intent en curso (el cajero abortó el cobro). */
export async function cancelarPaymentIntent(
  empresaId: string,
  deviceId: string,
  intentId: string
): Promise<void> {
  await mpFetch(
    empresaId,
    'DELETE',
    `/point/integration-api/devices/${deviceId}/payment-intents/${intentId}`
  );
}

/**
 * Normaliza el `state` de MP a nuestro estado de mp_cobros.
 * MP usa, entre otros: FINISHED (pago ok), CANCELED, ERROR, ABANDONED, etc.
 */
export function estadoCobroDesdeMp(state: string): 'pending' | 'approved' | 'rejected' | 'canceled' {
  const s = state.toUpperCase();
  if (s === 'FINISHED' || s === 'APPROVED') return 'approved';
  if (s === 'CANCELED' || s === 'ABANDONED') return 'canceled';
  if (s === 'ERROR' || s === 'REJECTED') return 'rejected';
  return 'pending';
}
