// SOLO LECTURA: consulta los planes en Flow e imprime el JSON completo, para
// ver el nombre exacto del campo de URL de notificación (urlCallback) y su
// valor actual. No crea ni modifica nada, no gatilla cobros.
//
// Uso: node scripts/flow-plan-inspect.mjs
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
  console.error('❌ Faltan FLOW_API_KEY / FLOW_SECRET_KEY en .env.local.');
  process.exit(1);
}

async function flowGet(endpoint, params) {
  const todos = { apiKey: API_KEY };
  for (const [k, v] of Object.entries(params)) todos[k] = String(v);
  const s = firmarParams(todos, SECRET);
  const res = await fetch(`${BASE}${endpoint}?${new URLSearchParams({ ...todos, s })}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `${endpoint} HTTP ${res.status}`);
  return data;
}

console.log('Flow API:', BASE, '\n');
for (const key of Object.keys(PLANES)) {
  const p = PLANES[key];
  try {
    const data = await flowGet('/plans/get', { planId: p.flowPlanId });
    console.log(`──── ${p.flowPlanId} ────`);
    console.log(JSON.stringify(data, null, 2));
    console.log();
  } catch (e) {
    console.error(`❌ ${p.flowPlanId}:`, e.message || e);
  }
}
