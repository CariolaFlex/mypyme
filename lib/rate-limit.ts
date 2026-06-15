// Rate limiter en memoria (ventana fija), sin dependencias.
//
// Alcance honesto: en serverless el estado vive por instancia, así que esto
// NO es un limitador distribuido — protege el caso común (un flood desde una
// IP que cae en una instancia caliente) antes de gatillar trabajo caro
// (p.ej. la llamada saliente a la API de Flow en el webhook). Para algo
// estricto a futuro: store compartido (Postgres/Upstash).

type Entrada = { count: number; resetAt: number };

const buckets = new Map<string, Entrada>();
// Cota de memoria: si el Map crece demasiado (muchas IPs distintas), se purga
// lo expirado y, si aún excede, se vacía (degradación segura: deja pasar).
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  /** Peticiones restantes en la ventana actual. */
  remaining: number;
  /** Segundos hasta que la ventana se reinicia (para Retry-After). */
  retryAfter: number;
};

/**
 * Cuenta una petición contra `key`. Permite `limit` por `windowMs`.
 * Devuelve ok=false cuando se excede.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) purgar(now);

  const e = buckets.get(key);
  if (!e || now >= e.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  e.count += 1;
  const retryAfter = Math.max(1, Math.ceil((e.resetAt - now) / 1000));
  if (e.count > limit) {
    return { ok: false, remaining: 0, retryAfter };
  }
  return { ok: true, remaining: limit - e.count, retryAfter };
}

/** Extrae la IP del cliente desde los headers de proxy (Vercel). */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'desconocida';
}

function purgar(now: number) {
  for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
  if (buckets.size > MAX_KEYS) buckets.clear();
}
