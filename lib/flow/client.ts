// Cliente de Flow.cl. Solo opera cuando hay credenciales configuradas; sin
// ellas, `flowConfigurado()` es false y nadie lo llama (la app sigue igual).
import { firmarParams } from './signature';

const FLOW_BASE = process.env.FLOW_API_URL ?? 'https://www.flow.cl/api';

export function flowConfigurado(): boolean {
  return !!process.env.FLOW_API_KEY && !!process.env.FLOW_SECRET_KEY;
}

function credenciales(): { apiKey: string; secret: string } {
  const apiKey = process.env.FLOW_API_KEY;
  const secret = process.env.FLOW_SECRET_KEY;
  if (!apiKey || !secret) throw new Error('Flow no configurado (faltan FLOW_API_KEY / FLOW_SECRET_KEY)');
  return { apiKey, secret };
}

/**
 * Llama a la API de Flow firmando los parámetros (HMAC-SHA256 sobre apiKey+params).
 * GET → query string; POST → body x-www-form-urlencoded. La firma `s` nunca se firma.
 */
async function flowRequest(
  method: 'GET' | 'POST',
  endpoint: string,
  params: Record<string, string | number>
): Promise<Record<string, unknown>> {
  const { apiKey, secret } = credenciales();
  const todos: Record<string, string> = { apiKey };
  for (const [k, v] of Object.entries(params)) todos[k] = String(v);
  const s = firmarParams(todos, secret);

  const url = `${FLOW_BASE}${endpoint}`;
  let res: Response;
  if (method === 'GET') {
    const qs = new URLSearchParams({ ...todos, s }).toString();
    res = await fetch(`${url}?${qs}`);
  } else {
    const body = new URLSearchParams({ ...todos, s }).toString();
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data?.message as string) || `Flow ${endpoint} HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export type FlowPaymentStatus = {
  status: number;          // 1 pendiente, 2 pagado, 3 rechazado, 4 anulado
  commerceOrder: string;
  subscriptionId?: string;
  amount: number;          // monto del cobro (CLP)
  paidAt?: string;         // fecha de pago (paymentData.date), si está
};

/** Estado real de un pago por token (segunda fase del webhook). */
export async function getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const data = await flowRequest('GET', '/payment/getStatus', { token });
  const paymentData = (data.paymentData ?? {}) as Record<string, unknown>;
  return {
    status: Number(data.status),
    commerceOrder: String(data.commerceOrder ?? ''),
    subscriptionId: data.subscriptionId ? String(data.subscriptionId) : undefined,
    amount: Number(data.amount ?? 0),
    paidAt: paymentData.date ? String(paymentData.date) : undefined,
  };
}

// ---------- Suscripciones ----------

/** Crea un plan recurrente. interval 3 = mensual. Idempotente por planId en Flow. */
export async function crearPlan(p: {
  planId: string; name: string; amount: number; currency?: string; interval?: number;
}): Promise<Record<string, unknown>> {
  return flowRequest('POST', '/plans/create', {
    planId: p.planId,
    name: p.name,
    amount: p.amount,
    currency: p.currency ?? 'CLP',
    interval: p.interval ?? 3,
  });
}

export async function getPlan(planId: string): Promise<Record<string, unknown>> {
  return flowRequest('GET', '/plans/get', { planId });
}

/** Crea un cliente en Flow. externalId = id de nuestra empresa (para conciliar). */
export async function crearCustomer(p: {
  name: string; email: string; externalId: string;
}): Promise<{ customerId: string }> {
  const data = await flowRequest('POST', '/customer/create', {
    name: p.name, email: p.email, externalId: p.externalId,
  });
  return { customerId: String(data.customerId) };
}

/**
 * Inicia el registro de tarjeta (PCI en Flow): devuelve una URL a la que se
 * redirige al usuario para inscribir su tarjeta, y un token.
 */
export async function registrarTarjeta(p: {
  customerId: string; urlReturn: string;
}): Promise<{ url: string; token: string }> {
  const data = await flowRequest('POST', '/customer/register', {
    customerId: p.customerId, url_return: p.urlReturn,
  });
  return { url: String(data.url) + '?token=' + String(data.token), token: String(data.token) };
}

/** Confirma el resultado del registro de tarjeta por su token. */
export async function getRegistroTarjeta(token: string): Promise<Record<string, unknown>> {
  return flowRequest('GET', '/customer/getRegisterStatus', { token });
}

/**
 * Crea la suscripción de un cliente (ya con tarjeta inscrita) a un plan.
 * `trialPeriodDays` difiere el primer cobro esa cantidad de días (Flow no cobra
 * hasta que termina el trial). Se usa para no cobrar a quien aún está en su
 * período de prueba de la app.
 */
export async function crearSubscription(p: {
  planId: string; customerId: string; trialPeriodDays?: number;
}): Promise<{ subscriptionId: string }> {
  const params: Record<string, string | number> = {
    planId: p.planId, customerId: p.customerId,
  };
  if (p.trialPeriodDays && p.trialPeriodDays > 0) {
    params.trial_period_days = Math.ceil(p.trialPeriodDays);
  }
  const data = await flowRequest('POST', '/subscription/create', params);
  return { subscriptionId: String(data.subscriptionId) };
}

export async function getSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
  return flowRequest('GET', '/subscription/get', { subscriptionId });
}

/**
 * Cancela una suscripción en Flow. `atPeriodEnd=true` (por defecto) deja de cobrar
 * pero mantiene la suscripción hasta el final del período ya pagado; false la corta
 * de inmediato. No realiza reembolsos.
 */
export async function cancelarSubscription(
  subscriptionId: string,
  atPeriodEnd = true
): Promise<Record<string, unknown>> {
  return flowRequest('POST', '/subscription/cancel', {
    subscriptionId,
    at_period_end: atPeriodEnd ? 1 : 0,
  });
}
