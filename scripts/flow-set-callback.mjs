// Setea el urlCallback de los planes de suscripción en Flow (la URL a la que
// Flow notifica cada pago → nuestro webhook). NO crea suscripciones ni cobra:
// solo edita configuración del plan. Idempotente. Reconfirma con un GET.
//
// Uso: node scripts/flow-set-callback.mjs [baseUrl]
//   baseUrl por defecto: https://mypyme-blond.vercel.app
//   ej. producción:  node scripts/flow-set-callback.mjs https://mypyme-blond.vercel.app
import { readFileSync } from 'node:fs';
import { firmarParams } from '../lib/flow/signature.ts';
import { PLANES } from '../lib/flow/subscription.ts';

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  if (!line.includes('=') || line.trim().startsWith('#')) continue;
  const i = line.indexOf('=');
  const k = line.slice(0, i).trim();
  const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  if (!(k in process.env)) process.env[k] = v;
}

const API_KEY = process.env.FLOW_API_KEY;
const SECRET = process.env.FLOW_SECRET_KEY;
const BASE = process.env.FLOW_API_URL ?? 'https://www.flow.cl/api';
const SITE = (process.argv[2] || 'https://mypyme-blond.vercel.app').replace(/\/$/, '');
const CALLBACK = `${SITE}/api/webhooks/flow`;

if (!API_KEY || !SECRET) {
  console.error('❌ Faltan FLOW_API_KEY / FLOW_SECRET_KEY en .env.local.');
  process.exit(1);
}

async function flow(method, endpoint, params) {
  const todos = { apiKey: API_KEY };
  for (const [k, v] of Object.entries(params)) todos[k] = String(v);
  const s = firmarParams(todos, SECRET);
  let res;
  if (method === 'GET') {
    res = await fetch(`${BASE}${endpoint}?${new URLSearchParams({ ...todos, s })}`);
  } else {
    res = await fetch(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...todos, s }).toString(),
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `${endpoint} HTTP ${res.status}`);
  return data;
}

console.log('Flow API:', BASE);
console.log('urlCallback →', CALLBACK, '\n');

for (const key of Object.keys(PLANES)) {
  const p = PLANES[key];
  try {
    await flow('POST', '/plans/edit', { planId: p.flowPlanId, urlCallback: CALLBACK });
    const check = await flow('GET', '/plans/get', { planId: p.flowPlanId });
    const ok = check.urlCallback === CALLBACK;
    console.log(`${ok ? '✅' : '❌'} ${p.flowPlanId} → urlCallback = ${check.urlCallback}`);
    if (!ok) process.exitCode = 1;
  } catch (e) {
    console.error(`❌ ${p.flowPlanId}:`, e.message || e);
    process.exitCode = 1;
  }
}
