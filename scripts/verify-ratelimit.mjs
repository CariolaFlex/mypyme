// Verificación de lib/rate-limit.ts (lógica pura, sin DB ni red).
// Uso: node scripts/verify-ratelimit.mjs
import { rateLimit, clientIp } from '../lib/rate-limit.ts';

let ok = true;
const results = [];
const check = (n, c, x = '') => { results.push({ n, c: !!c, x }); if (!c) ok = false; };

// 1. Permite hasta el límite y bloquea al excederlo.
const K = 'test:' + Date.now();
let last;
for (let i = 0; i < 3; i++) last = rateLimit(K, 3, 60_000);
check('3/3 permitidas (remaining 0)', last.ok && last.remaining === 0, JSON.stringify(last));
const cuarta = rateLimit(K, 3, 60_000);
check('4ta bloqueada (ok=false)', cuarta.ok === false, JSON.stringify(cuarta));
check('retryAfter > 0 al bloquear', cuarta.retryAfter > 0, `got ${cuarta.retryAfter}`);

// 2. Llaves independientes no se afectan.
const otra = rateLimit('test-otra:' + Date.now(), 3, 60_000);
check('llave distinta arranca fresca', otra.ok && otra.remaining === 2, JSON.stringify(otra));

// 3. Ventana expirada reinicia el conteo.
const K2 = 'test-exp:' + Date.now();
rateLimit(K2, 1, 1); // límite 1, ventana 1ms
await new Promise((r) => setTimeout(r, 5));
const trasExpirar = rateLimit(K2, 1, 1);
check('ventana expirada reinicia', trasExpirar.ok, JSON.stringify(trasExpirar));

// 4. clientIp extrae la primera IP de x-forwarded-for.
const reqXff = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
check('clientIp toma la 1ra de x-forwarded-for', clientIp(reqXff) === '1.2.3.4', clientIp(reqXff));
const reqReal = new Request('http://x', { headers: { 'x-real-ip': '9.9.9.9' } });
check('clientIp usa x-real-ip de fallback', clientIp(reqReal) === '9.9.9.9', clientIp(reqReal));
const reqNada = new Request('http://x');
check('clientIp sin headers → "desconocida"', clientIp(reqNada) === 'desconocida', clientIp(reqNada));

console.log('\n=== Resultados verificación rate-limit ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.x}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
