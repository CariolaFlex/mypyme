// Verifica la lógica de alta de usuario de la server action `crearEmpleado`
// (app/(dashboard)/configuracion/usuarios/actions.ts), que no se puede invocar
// fuera del request de Next. Reproduce la MISMA secuencia de admin-API y asserta
// las 3 ramas: (a) email nuevo → crea+vincula, (b) email existente → vincula sin
// duplicar cuenta, (c) ya es miembro → rechaza. LIMPIA todo al final.
//
// Uso: node scripts/verify-crear-empleado.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const t = Date.now();
const OWNER = `owner-${t}@example.com`;
const NUEVO = `nuevo-${t}@example.com`;     // rama (a)
const EXISTE = `existe-${t}@example.com`;   // rama (b): preexiste sin membresía
const PASS = 'Test1234!';

let owner, empresa, idsCreados = [], ok = true;
const results = [];
function check(name, cond, extra = '') { results.push({ name, pass: !!cond, extra }); if (!cond) ok = false; }

// Réplica de la lógica de crearEmpleado (sin el contexto de request de Next).
async function crearEmpleado(empresaId, email, password, rol) {
  email = email.trim().toLowerCase();
  let userId;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) return { error: createErr.message };
    userId = existing.id;
  } else {
    userId = created.user.id;
    idsCreados.push(userId);
  }
  const { data: ya } = await admin.from('usuarios_empresa').select('id').eq('empresa_id', empresaId).eq('usuario_id', userId).maybeSingle();
  if (ya) return { error: 'Ese usuario ya pertenece a la empresa' };
  const { error: memErr } = await admin.from('usuarios_empresa').insert({ empresa_id: empresaId, usuario_id: userId, rol });
  if (memErr) return { error: memErr.message };
  return { userId };
}

try {
  // Empresa + owner
  const { data: ou } = await admin.auth.admin.createUser({ email: OWNER, password: PASS, email_confirm: true });
  owner = ou.user.id;
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s } = await sb.auth.signInWithPassword({ email: OWNER, password: PASS });
  const { data: eid, error: oe } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '60000000-4', p_razon_social: 'Cafetería Alta', p_usa_iva: true });
  if (oe) throw oe;
  empresa = eid;
  await sb.auth.refreshSession({ refresh_token: s.session.refresh_token });

  // (a) email nuevo → crea + vincula
  const a = await crearEmpleado(empresa, NUEVO, PASS, 'empleado');
  check('(a) email nuevo crea y vincula', !a.error && a.userId, JSON.stringify(a));

  // pre-crear una cuenta que existe pero SIN membresía
  const { data: pre } = await admin.auth.admin.createUser({ email: EXISTE, password: PASS, email_confirm: true });
  idsCreados.push(pre.user.id);

  // (b) email existente → vincula sin crear cuenta nueva (mismo id)
  const b = await crearEmpleado(empresa, EXISTE, 'otraClave99', 'admin');
  check('(b) email existente se vincula (mismo id)', !b.error && b.userId === pre.user.id, JSON.stringify(b));

  // (c) ya es miembro → rechaza
  const c = await crearEmpleado(empresa, NUEVO, PASS, 'empleado');
  check('(c) miembro duplicado se rechaza', !!c.error, JSON.stringify(c));

  // estado final: empresa tiene owner + NUEVO + EXISTE = 3 miembros
  const { data: l } = await sb.rpc('listar_usuarios_empresa');
  check('empresa queda con 3 miembros', l.length === 3, JSON.stringify(l.map((x) => x.email)));
  check('EXISTE quedó como admin', l.find((x) => x.email === EXISTE)?.rol === 'admin', JSON.stringify(l));
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresa) await admin.from('empresas').delete().eq('id', empresa);
  if (owner) await admin.auth.admin.deleteUser(owner);
  for (const id of idsCreados) { try { await admin.auth.admin.deleteUser(id); } catch {} }
}

console.log('\n=== Resultados verificación alta de usuario ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
