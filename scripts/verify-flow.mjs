// Verificación de la fundación de Fase 6 (Flow):
//  - Helpers puros (firma HMAC, mapeo de estado, días de trial, acceso) importando
//    los .ts directo (Node 24 hace type-stripping).
//  - e2e migración: onboarding setea estado_suscripcion='trial' y trial_termina_en
//    ~14 días, flow_* en null. LIMPIA la cuenta de prueba.
//
// Uso: node scripts/verify-flow.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { firmarParams, verificarFirma } from '../lib/flow/signature.ts';
import { estadoDesdeFlow, diasRestantesTrial, tieneAcceso } from '../lib/flow/subscription.ts';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { persistSession: false } });

let ok = true;
const results = [];
function check(name, cond, extra = '') { results.push({ name, pass: !!cond, extra }); if (!cond) ok = false; }

// ---- 1. helpers puros ----
const firma = firmarParams({ apiKey: 'KEY', commerceOrder: '123', amount: '9990' }, 'SECRET');
check('firmarParams vector conocido', firma === '326ce592e32ae1c064b5a3fc801df157dba80e1fa3e4b5cebd0ccf1646b23299', firma);
check('verificarFirma OK', verificarFirma({ apiKey: 'KEY', commerceOrder: '123', amount: '9990' }, firma, 'SECRET'));
check('verificarFirma rechaza firma mala', !verificarFirma({ apiKey: 'KEY' }, 'deadbeef', 'SECRET'));

check('estadoDesdeFlow 2 → activa', estadoDesdeFlow(2) === 'activa');
check('estadoDesdeFlow 4 → cancelada', estadoDesdeFlow(4) === 'cancelada');
check('estadoDesdeFlow 3 → morosa', estadoDesdeFlow(3) === 'morosa');
check('estadoDesdeFlow morose → morosa', estadoDesdeFlow(2, true) === 'morosa');
check('estadoDesdeFlow 1 → trial', estadoDesdeFlow(1) === 'trial');

const ahora = new Date('2026-06-14T12:00:00Z');
const en10 = new Date('2026-06-24T12:00:00Z').toISOString();
const hace2 = new Date('2026-06-12T12:00:00Z').toISOString();
check('diasRestantesTrial futuro ≈ 10', diasRestantesTrial(en10, ahora) === 10, String(diasRestantesTrial(en10, ahora)));
check('diasRestantesTrial pasado < 0', diasRestantesTrial(hace2, ahora) < 0);
check('diasRestantesTrial null', diasRestantesTrial(null) === null);

check('tieneAcceso activa', tieneAcceso('activa', null, ahora) === true);
check('tieneAcceso trial vigente', tieneAcceso('trial', en10, ahora) === true);
check('tieneAcceso trial vencido', tieneAcceso('trial', hace2, ahora) === false);
check('tieneAcceso cancelada', tieneAcceso('cancelada', en10, ahora) === false);

// ---- 2. e2e migración: onboarding setea el trial ----
let userId, empresaId;
try {
  const email = `flow-${Date.now()}@example.com`;
  const PASS = 'Test1234!';
  const { data: u } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true });
  userId = u.user.id;
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword({ email, password: PASS });
  const { data: eid, error: oe } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '99999999-9', p_razon_social: 'Cafetería Flow', p_usa_iva: true });
  if (oe) throw oe;
  empresaId = eid;

  const { data: emp } = await admin.from('empresas')
    .select('estado_suscripcion, trial_termina_en, flow_customer_id, flow_subscription_id')
    .eq('id', empresaId).single();
  check('estado_suscripcion == trial', emp.estado_suscripcion === 'trial', emp.estado_suscripcion);
  check('flow_customer_id null', emp.flow_customer_id === null);
  check('flow_subscription_id null', emp.flow_subscription_id === null);
  const dias = diasRestantesTrial(emp.trial_termina_en);
  check('trial ~14 días (13-15, tolera skew)', dias >= 13 && dias <= 15, `got ${dias} (${emp.trial_termina_en})`);

  // Regresión: el onboarding debe seguir sembrando catálogo base.
  const [mp, cj, cg, bd] = await Promise.all([
    admin.from('metodos_pago').select('tipo').eq('empresa_id', empresaId),
    admin.from('cajas').select('id').eq('empresa_id', empresaId),
    admin.from('categorias_gasto').select('id').eq('empresa_id', empresaId),
    admin.from('bodegas').select('id').eq('empresa_id', empresaId),
  ]);
  check('siembra 4 métodos de pago (incl. cash)', mp.data?.length === 4 && mp.data.some((m) => m.tipo === 'cash'), JSON.stringify(mp.data));
  check('siembra Caja 1', cj.data?.length === 1, JSON.stringify(cj.data));
  check('siembra 5 categorías de gasto', cg.data?.length === 5, `got ${cg.data?.length}`);
  check('siembra bodega Principal', bd.data?.length === 1, `got ${bd.data?.length}`);
} catch (e) {
  console.error('💥', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Resultados verificación Flow (Fase 6) ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
