// DIAGNÓSTICO del enroll: reproduce el customer/register de Flow con el
// customer real de la empresa para capturar el mensaje de error COMPLETO.
// customer/register solo genera una sesión de inscripción (URL+token) → NO cobra.
//
// Uso: node scripts/flow-diag-enroll.mjs
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
const SITE = env.NEXT_PUBLIC_SITE_URL ?? 'https://mypyme-blond.vercel.app';
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function flowPost(endpoint, params) {
  const todos = { apiKey: API_KEY };
  for (const [k, v] of Object.entries(params)) todos[k] = String(v);
  const s = firmarParams(todos, SECRET);
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...todos, s }).toString(),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

console.log('Flow API:', BASE, '\n');

// Customer real de la empresa Vectium.
const { data: emp } = await admin
  .from('empresas')
  .select('id, razon_social, flow_customer_id, flow_subscription_id, estado_suscripcion, plan')
  .ilike('razon_social', 'Vectium%')
  .maybeSingle();
console.log('Empresa:', JSON.stringify(emp, null, 2), '\n');

if (!emp?.flow_customer_id) {
  console.log('⚠️  La empresa no tiene flow_customer_id → el error fue en customer/create.');
  console.log('Probando customer/create directo para ver el mensaje...\n');
  const r = await flowPost('/customer/create', {
    name: emp?.razon_social ?? 'Test', email: 'diag@example.com', externalId: 'diag-' + Date.now(),
  });
  console.log('customer/create →', r.status, r.body);
} else {
  console.log('Probando customer/register con el customer real...\n');
  const r = await flowPost('/customer/register', {
    customerId: emp.flow_customer_id,
    url_return: `${SITE}/configuracion/suscripcion/retorno`,
  });
  console.log('customer/register →', r.status, r.body);
}
