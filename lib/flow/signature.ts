// Firma HMAC-SHA256 que exige Flow.cl en cada request (y con la que firma sus
// notificaciones). Algoritmo: ordenar las claves alfabéticamente, concatenar
// `clave+valor` sin separador, y firmar con la secret key.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Firma un set de parámetros (incluye apiKey entre los params si Flow lo pide). */
export function firmarParams(params: Record<string, string>, secretKey: string): string {
  const stringToSign = Object.keys(params)
    .sort()
    .map((k) => k + params[k])
    .join('');
  return createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

/** Verifica (en tiempo constante) la firma de una notificación entrante de Flow. */
export function verificarFirma(
  params: Record<string, string>,
  firmaRecibida: string,
  secretKey: string
): boolean {
  const esperada = firmarParams(params, secretKey);
  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(firmaRecibida ?? '', 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
