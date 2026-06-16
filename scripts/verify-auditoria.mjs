// Verificación e2e de la bitácora de cambios (Sprint 1A).
// Crea/edita/desactiva un producto y confirma que la auditoría registró cada
// acción con actor + datos_antes/después; aislamiento entre empresas; y que un
// empleado (no admin) no puede leer la bitácora. LIMPIA todo al final.
//
// Uso: node scripts/verify-auditoria.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { persistSession: false } });

const t = Date.now();
const E1 = `audit-admin-${t}@example.com`;
const E2 = `audit-emp-${t}@example.com`;
const E3 = `audit-b-${t}@example.com`;
const PASS = 'Test1234!';

let u1, u2, u3, empA, empB, ok = true;
const results = [];
const check = (n, c, x = '') => { results.push({ n, c: !!c, x }); if (!c) ok = false; };

async function nuevo(email) { const { data } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true }); return data.user.id; }
async function loginRefresh(email) {
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data } = await sb.auth.signInWithPassword({ email, password: PASS });
  return { sb, rt: data.session.refresh_token };
}

try {
  // Empresa A + admin
  u1 = await nuevo(E1);
  const a = await loginRefresh(E1);
  const { data: eidA, error: oeA } = await a.sb.rpc('crear_empresa_y_membresia', { p_rut: '99999999-9', p_razon_social: 'Negocio Audit', p_usa_iva: true });
  if (oeA) throw oeA;
  empA = eidA;
  await a.sb.auth.refreshSession({ refresh_token: a.rt });

  // crear producto → audit insert
  const { data: prod, error: pe } = await a.sb.from('productos')
    .insert({ empresa_id: empA, sku: 'CAFE', nombre: 'Café', precio_total: 2000, precio_neto: 1681, tasa_iva: 19, controla_stock: false })
    .select('id').single();
  if (pe) throw pe;

  // editar precio → audit update (antes 2000 → después 2500)
  const { error: ue } = await a.sb.from('productos').update({ precio_total: 2500 }).eq('id', prod.id);
  if (ue) throw ue;

  // "borrar" = desactivar → audit update (activo true → false)
  const { error: de } = await a.sb.from('productos').update({ activo: false }).eq('id', prod.id);
  if (de) throw de;

  // leer la bitácora del producto (como admin)
  const { data: logs, error: le } = await a.sb.from('auditoria')
    .select('accion, actor_email, datos_antes, datos_despues, tabla')
    .eq('tabla', 'productos').eq('registro_id', prod.id).order('ocurrido_en');
  if (le) throw le;

  check('hay 3 eventos del producto (insert+update+update)', logs.length === 3, `got ${logs.length}`);
  const ins = logs.find((l) => l.accion === 'insert');
  const ups = logs.filter((l) => l.accion === 'update');
  check('insert registrado con datos_despues', ins && Number(ins.datos_despues?.precio_total) === 2000, JSON.stringify(ins?.datos_despues?.precio_total));
  check('actor_email = admin', ins && ins.actor_email === E1, ins?.actor_email);
  const upPrecio = ups.find((l) => Number(l.datos_antes?.precio_total) === 2000 && Number(l.datos_despues?.precio_total) === 2500);
  check('update de precio guarda antes(2000)→después(2500)', !!upPrecio, JSON.stringify(ups.map((u) => [u.datos_antes?.precio_total, u.datos_despues?.precio_total])));
  const upBaja = ups.find((l) => l.datos_antes?.activo === true && l.datos_despues?.activo === false);
  check('desactivar guarda activo true→false', !!upBaja, JSON.stringify(ups.map((u) => [u.datos_antes?.activo, u.datos_despues?.activo])));

  // onboarding también dejó rastro (empresa/config/usuario)
  const { data: onb } = await a.sb.from('auditoria').select('tabla').eq('accion', 'insert');
  const tablasOnb = new Set((onb ?? []).map((r) => r.tabla));
  check('onboarding auditado (empresas + usuarios_empresa)', tablasOnb.has('empresas') && tablasOnb.has('usuarios_empresa'), [...tablasOnb].join(','));

  // Empresa B no ve la bitácora de A
  u3 = await nuevo(E3);
  const b = await loginRefresh(E3);
  const { data: eidB } = await b.sb.rpc('crear_empresa_y_membresia', { p_rut: '60000000-4', p_razon_social: 'Negocio B', p_usa_iva: true });
  empB = eidB;
  await b.sb.auth.refreshSession({ refresh_token: b.rt });
  const { data: logsB } = await b.sb.from('auditoria').select('id').eq('tabla', 'productos').eq('registro_id', prod.id);
  check('empresa B NO ve auditoría de A', (logsB ?? []).length === 0, `got ${logsB?.length}`);

  // Empleado de A (no admin) NO ve la bitácora (RLS solo admin)
  u2 = await nuevo(E2);
  await admin.from('usuarios_empresa').insert({ usuario_id: u2, empresa_id: empA, rol: 'empleado' });
  const e = await loginRefresh(E2);
  await e.sb.auth.refreshSession({ refresh_token: e.rt });
  const { data: logsEmp } = await e.sb.from('auditoria').select('id').limit(5);
  check('empleado NO ve la bitácora', (logsEmp ?? []).length === 0, `got ${logsEmp?.length}`);
} catch (err) {
  console.error('💥', err.message || err);
  ok = false;
} finally {
  if (empA) await admin.from('empresas').delete().eq('id', empA);
  if (empB) await admin.from('empresas').delete().eq('id', empB);
  // auditoria no tiene FK a empresas → limpiar las filas de prueba a mano.
  const ids = [empA, empB].filter(Boolean);
  if (ids.length) await admin.from('auditoria').delete().in('empresa_id', ids);
  for (const u of [u1, u2, u3]) if (u) await admin.auth.admin.deleteUser(u);
}

console.log('\n=== Resultados verificación auditoría ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.x}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
