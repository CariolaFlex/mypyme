// Completa la suscripción que el /retorno no creó (la sesión se cayó en el
// viaje a Flow). La tarjeta YA está registrada en Flow; esto solo crea la
// suscripción al plan con los días de trial restantes → NO cobra ahora.
// Replica la lógica de /retorno. Idempotente: si ya hay suscripción, no hace nada.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { firmarParams } from '../lib/flow/signature.ts';
import { PLANES, diasRestantesTrial } from '../lib/flow/subscription.ts';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const API_KEY = env.FLOW_API_KEY, SECRET = env.FLOW_SECRET_KEY;
const BASE = env.FLOW_API_URL ?? 'https://www.flow.cl/api';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function flow(method, endpoint, params) {
  const todos = { apiKey: API_KEY };
  for (const [k, v] of Object.entries(params)) todos[k] = String(v);
  const s = firmarParams(todos, SECRET);
  let res;
  if (method === 'GET') {
    res = await fetch(`${BASE}${endpoint}?${new URLSearchParams({ ...todos, s })}`);
  } else {
    res = await fetch(`${BASE}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...todos, s }).toString(),
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `${endpoint} HTTP ${res.status}`);
  return data;
}

const { data: emp } = await admin
  .from('empresas')
  .select('id, razon_social, flow_customer_id, flow_subscription_id, estado_suscripcion, plan, trial_termina_en')
  .ilike('razon_social', 'Vectium%')
  .maybeSingle();

if (!emp?.flow_customer_id) { console.error('❌ Sin flow_customer_id'); process.exit(1); }
if (emp.flow_subscription_id) {
  console.log('✅ Ya tiene suscripción:', emp.flow_subscription_id, '(no hago nada)');
  process.exit(0);
}

const planKey = emp.plan ?? 'emprende';
const planId = (PLANES[planKey] ?? PLANES.emprende).flowPlanId;
const dias = diasRestantesTrial(emp.trial_termina_en);
const trialPeriodDays = dias && dias > 0 ? Math.ceil(dias) : undefined;

console.log(`Creando suscripción: plan=${planId} customer=${emp.flow_customer_id} trial_period_days=${trialPeriodDays ?? '(ninguno)'}`);

const params = { planId, customerId: emp.flow_customer_id };
if (trialPeriodDays) params.trial_period_days = trialPeriodDays;
const sub = await flow('POST', '/subscription/create', params);
console.log('\n=== Respuesta subscription/create ===');
console.log(JSON.stringify(sub, null, 2));

const subId = String(sub.subscriptionId);
const { error } = await admin
  .from('empresas')
  .update({ flow_subscription_id: subId, estado_suscripcion: 'activa' })
  .eq('id', emp.id);
if (error) { console.error('❌ Error actualizando empresa:', error.message); process.exit(1); }
console.log(`\n✅ Empresa actualizada: flow_subscription_id=${subId}, estado=activa`);

const check = await flow('GET', '/subscription/get', { subscriptionId: subId });
console.log('\n=== Suscripción en Flow (confirmación) ===');
console.log(JSON.stringify(check, null, 2));
