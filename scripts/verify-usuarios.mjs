// Verificación e2e de gestión de usuarios (/configuracion/usuarios).
// Prueba listar_usuarios_empresa (DEFINER, email desde auth.users),
// cambiar_rol_usuario_empresa y quitar_usuario_empresa con sus guardas:
// solo admin, no auto-quitarse, no dejar la empresa sin admin, aislamiento tenant.
// LIMPIA todo al final.
//
// Uso: node scripts/verify-usuarios.mjs   (lee .env.local)
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
if (!URL_ || !ANON || !SVC) throw new Error('Faltan claves en .env.local');

const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const RUT_A = '76192083-9';
const RUT_B = '77815460-9';
const t = Date.now();
const E1 = `u1-${t}@example.com`;  // owner empresa A (admin)
const E2 = `u2-${t}@example.com`;  // empleado empresa A
const E3 = `u3-${t}@example.com`;  // owner empresa B
const PASS = 'Test1234!';

let user1, user2, user3, empresaA, empresaB, ok = true;
const results = [];
function check(name, cond, extra = '') { results.push({ name, pass: !!cond, extra }); if (!cond) ok = false; }

async function nuevoUsuario(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}
function cliente() { return createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } }); }
async function loginRefresh(sb, email) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASS });
  if (error) throw error;
  return data.session.refresh_token;
}

try {
  // Empresa A + owner
  user1 = await nuevoUsuario(E1);
  const sbA = cliente();
  const rtA = await loginRefresh(sbA, E1);
  const { data: eidA, error: oeA } = await sbA.rpc('crear_empresa_y_membresia', { p_rut: RUT_A, p_razon_social: 'Negocio A', p_usa_iva: true });
  if (oeA) throw oeA;
  empresaA = eidA;
  await sbA.auth.refreshSession({ refresh_token: rtA });

  // user2 empleado en A (simula el efecto de crearEmpleado)
  user2 = await nuevoUsuario(E2);
  const { error: m2 } = await admin.from('usuarios_empresa').insert({ usuario_id: user2, empresa_id: empresaA, rol: 'empleado' });
  if (m2) throw m2;

  // Empresa B + owner (aislamiento)
  user3 = await nuevoUsuario(E3);
  const sbB = cliente();
  const rtB = await loginRefresh(sbB, E3);
  const { data: eidB, error: oeB } = await sbB.rpc('crear_empresa_y_membresia', { p_rut: RUT_B, p_razon_social: 'Negocio B', p_usa_iva: true });
  if (oeB) throw oeB;
  empresaB = eidB;
  await sbB.auth.refreshSession({ refresh_token: rtB });

  // 1. listar desde A → 2 miembros con emails y roles correctos
  const { data: l1, error: le1 } = await sbA.rpc('listar_usuarios_empresa');
  if (le1) throw le1;
  check('A lista 2 miembros', l1.length === 2, JSON.stringify(l1));
  const r1 = l1.find((x) => x.usuario_id === user1);
  const r2 = l1.find((x) => x.usuario_id === user2);
  check('owner es admin con email', r1 && r1.rol === 'admin' && r1.email === E1, JSON.stringify(r1));
  check('empleado con email', r2 && r2.rol === 'empleado' && r2.email === E2, JSON.stringify(r2));

  // 2. cambiar_rol(user2 → admin)
  const { error: c1 } = await sbA.rpc('cambiar_rol_usuario_empresa', { p_target: user2, p_rol: 'admin' });
  check('cambiar rol user2 → admin OK', !c1, c1?.message);
  const { data: l2 } = await sbA.rpc('listar_usuarios_empresa');
  check('user2 ahora admin', l2.find((x) => x.usuario_id === user2)?.rol === 'admin', JSON.stringify(l2));

  // 3. no auto-quitarse
  const { error: q1 } = await sbA.rpc('quitar_usuario_empresa', { p_target: user1 });
  check('no puede quitarse a sí mismo', !!q1, q1 ? 'rechazó OK' : 'permitió (MAL)');

  // 4. volver user2 a empleado (queda user1 como único admin)
  const { error: c2 } = await sbA.rpc('cambiar_rol_usuario_empresa', { p_target: user2, p_rol: 'empleado' });
  check('cambiar rol user2 → empleado OK', !c2, c2?.message);

  // 5. guardia último admin: degradar al único admin (user1) debe fallar
  const { error: c3 } = await sbA.rpc('cambiar_rol_usuario_empresa', { p_target: user1, p_rol: 'empleado' });
  check('no deja la empresa sin admin', !!c3, c3 ? 'rechazó OK' : 'permitió (MAL)');

  // 6. quitar al empleado user2 → OK; listar → 1
  const { error: q2 } = await sbA.rpc('quitar_usuario_empresa', { p_target: user2 });
  check('quitar empleado OK', !q2, q2?.message);
  const { data: l3 } = await sbA.rpc('listar_usuarios_empresa');
  check('A queda con 1 miembro', l3.length === 1 && l3[0].usuario_id === user1, JSON.stringify(l3));

  // 7. aislamiento: B solo se ve a sí mismo
  const { data: lB } = await sbB.rpc('listar_usuarios_empresa');
  check('B solo ve su propio miembro', lB.length === 1 && lB[0].usuario_id === user3, JSON.stringify(lB));

  // 8. no-admin no puede cambiar roles: re-agregar user2 como empleado y loguear como él
  await admin.from('usuarios_empresa').insert({ usuario_id: user2, empresa_id: empresaA, rol: 'empleado' });
  const sbEmp = cliente();
  const rtE = await loginRefresh(sbEmp, E2);
  await sbEmp.auth.refreshSession({ refresh_token: rtE });
  const { error: c4 } = await sbEmp.rpc('cambiar_rol_usuario_empresa', { p_target: user1, p_rol: 'empleado' });
  check('empleado NO puede cambiar roles', !!c4, c4 ? 'rechazó OK' : 'permitió (MAL)');

  // 9. anon no ejecuta listar
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: aErr } = await anonClient.rpc('listar_usuarios_empresa');
  check('anon NO puede listar', !!aErr, aErr ? aErr.code : 'sin error (MAL)');
} catch (e) {
  console.error('\n💥 Error en el flujo:', e.message || e);
  ok = false;
} finally {
  if (empresaA) await admin.from('empresas').delete().eq('id', empresaA);
  if (empresaB) await admin.from('empresas').delete().eq('id', empresaB);
  if (user1) await admin.auth.admin.deleteUser(user1);
  if (user2) await admin.auth.admin.deleteUser(user2);
  if (user3) await admin.auth.admin.deleteUser(user3);
}

console.log('\n=== Resultados verificación usuarios ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
