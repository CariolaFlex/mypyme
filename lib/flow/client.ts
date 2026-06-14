// Cliente mínimo de Flow.cl. Solo opera cuando hay credenciales configuradas;
// sin ellas, `flowConfigurado()` es false y nadie lo llama (la app sigue igual).
import { firmarParams } from './signature';

const FLOW_BASE = process.env.FLOW_API_URL ?? 'https://www.flow.cl/api';

export function flowConfigurado(): boolean {
  return !!process.env.FLOW_API_KEY && !!process.env.FLOW_SECRET_KEY;
}

export type FlowPaymentStatus = {
  status: number;          // 1 pendiente, 2 pagado, 3 rechazado, 4 anulado
  commerceOrder: string;
  subscriptionId?: string;
};

/** Consulta el estado real de un pago por su token (segunda fase del webhook). */
export async function getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const apiKey = process.env.FLOW_API_KEY!;
  const secret = process.env.FLOW_SECRET_KEY!;
  const params = { apiKey, token };
  const s = firmarParams(params, secret);
  const url =
    `${FLOW_BASE}/payment/getStatus?apiKey=${encodeURIComponent(apiKey)}` +
    `&token=${encodeURIComponent(token)}&s=${s}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Flow getStatus HTTP ${res.status}`);
  const data = await res.json();
  return {
    status: Number(data.status),
    commerceOrder: String(data.commerceOrder ?? ''),
    subscriptionId: data.subscriptionId ? String(data.subscriptionId) : undefined,
  };
}
