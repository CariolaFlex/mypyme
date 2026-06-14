// Crea (idempotente) los planes de suscripción en Flow vía API.
// Requiere FLOW_API_KEY / FLOW_SECRET_KEY / FLOW_API_URL en .env.local.
// No necesita tocar el dashboard de Flow.
//
// Reusa la MISMA firma HMAC de la app (lib/flow/signature.ts) y replica el
// request firmado (no importa client.ts porque sus imports sin extensión no
// resuelven en el runtime TS de Node; en Next/webpack sí).
//
// Uso: node scripts/flow-setup.mjs
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
if (!API_KEY || !SECRET) {
  console.error('❌ Faltan FLOW_API_KEY / FLOW_SECRET_KEY en .env.local. Agrégalas y reintenta.');
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
for (const key of Object.keys(PLANES)) {
  const p = PLANES[key];
  try {
    const existe = await flow('GET', '/plans/get', { planId: p.flowPlanId });
    console.log(`✅ ya existe: ${p.flowPlanId} (${existe.name ?? p.nombre})`);
  } catch {
    try {
      await flow('POST', '/plans/create', {
        planId: p.flowPlanId, name: `mypyme ${p.nombre}`, amount: p.precioMensual, currency: 'CLP', interval: 3,
      });
      console.log(`✅ creado: ${p.flowPlanId} — $${p.precioMensual}/mes`);
    } catch (e) {
      console.error(`❌ error creando ${p.flowPlanId}:`, e.message || e);
      process.exit(1);
    }
  }
}
console.log('\nPlanes listos:', Object.values(PLANES).map((p) => p.flowPlanId).join(', '));
