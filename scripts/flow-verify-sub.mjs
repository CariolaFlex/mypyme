// SOLO LECTURA: verifica el estado de la suscripción tras el enroll.
// Lee la empresa en la DB y, si tiene suscripción, consulta Flow (subscription/get)
// para confirmar el trial y la próxima fecha de cobro. No cobra ni modifica nada.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { firmarParams } from '../lib/flow/signature.ts';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const API_KEY = env.FLOW_API_KEY, SECRET = env.FLOW_SECRET_KEY;
const BASE = env.FLOW_API_URL ?? 'https://www.flow.cl/api';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function flowGet(endpoint, params) {
  const todos = { apiKey: API_KEY };
  for (const [k, v] of Object.entries(params)) todos[k] = String(v);
  const s = firmarParams(todos, SECRET);
  const res = await fetch(`${BASE}${endpoint}?${new URLSearchParams({ ...todos, s })}`);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const { data: emp } = await admin
  .from('empresas')
  .select('id, razon_social, flow_customer_id, flow_subscription_id, estado_suscripcion, plan, trial_termina_en')
  .ilike('razon_social', 'Vectium%')
  .maybeSingle();

console.log('=== Empresa en la DB ===');
console.log(JSON.stringify(emp, null, 2), '\n');

if (emp?.flow_subscription_id) {
  console.log('✅ Tiene flow_subscription_id → /retorno creó la suscripción.');
  const sub = await flowGet('/subscription/get', { subscriptionId: emp.flow_subscription_id });
  console.log('\n=== Suscripción en Flow ===');
  console.log(JSON.stringify(sub.body, null, 2));
} else {
  console.log('⚠️  Sin flow_subscription_id → el /retorno no completó (¿no volviste a la app?).');
}

const { data: pagos } = await admin
  .from('pagos_suscripcion')
  .select('flow_status, estado, monto, pagado_en')
  .eq('empresa_id', emp?.id ?? '00000000-0000-0000-0000-000000000000');
console.log('\n=== Historial de pagos en la DB ===');
console.log(pagos?.length ? JSON.stringify(pagos, null, 2) : '(vacío — esperado: el cobro está diferido por el trial)');
