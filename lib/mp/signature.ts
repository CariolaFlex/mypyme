// Validación de la firma de los webhooks de Mercado Pago (header x-signature).
// MP firma un "manifest" con HMAC-SHA256 y la clave secreta del webhook:
//   manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
// El header viene como: `ts=<timestamp>,v1=<hash hex>`.
// Doc: developers.mercadopago > Notificaciones > Webhooks (validar origen).
import { createHmac, timingSafeEqual } from 'node:crypto';

function parseXSignature(header: string): { ts: string; v1: string } | null {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...v] = p.split('=');
      return [k.trim(), v.join('=').trim()];
    })
  );
  if (!parts.ts || !parts.v1) return null;
  return { ts: parts.ts, v1: parts.v1 };
}

/**
 * Verifica (tiempo constante) la firma del webhook de MP.
 * @param dataId    valor de `data.id` del query (id del recurso notificado)
 * @param requestId header `x-request-id`
 * @param xSignature header `x-signature`
 * @param secret    MP_WEBHOOK_SECRET
 */
export function verificarFirmaMp(
  dataId: string,
  requestId: string,
  xSignature: string,
  secret: string
): boolean {
  const parsed = parseXSignature(xSignature ?? '');
  if (!parsed) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  const esperada = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(parsed.v1, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
