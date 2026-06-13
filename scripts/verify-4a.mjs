// Verificación e2e Fase 4A: proveedores + categorías de gasto + gastos
// (con/sin efectivo) + impacto en caja. Crea empresa de prueba y LIMPIA al final.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-4a-${Date.now()}@example.com`, PASS = 'Test1234!';
let userId, empresaId, ok = true;
const results = [];
const approx = (a, b, t = 1) => Math.abs(Number(a) - Number(b)) <= t;
const check = (n, c, e = '') => { results.push({ n, c: !!c, e }); if (!c) ok = false; };

try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (ue) throw ue;
  userId = u.user.id;
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'Gastos Test 4A', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  // categorías sembradas por onboarding
  const { data: cats } = await sb.from('categorias_gasto').select('id, nombre').order('nombre');
  check('onboarding siembra 5 categorías de gasto', cats?.length === 5, JSON.stringify(cats?.map((c) => c.nombre)));
  const catInsumos = cats.find((c) => c.nombre === 'Insumos').id;

  // proveedor (RLS escritura admin)
  const { data: prov, error: pe } = await sb.from('proveedores').insert({ empresa_id: empresaId, nombre: 'Distribuidora X', rut: '77777777-7' }).select('id').single();
  check('crear proveedor', !pe && !!prov?.id, pe?.message);

  // abrir caja
  const { data: sesionId } = await sb.rpc('abrir_caja', { p_monto_apertura: 50000 });

  // gasto en efectivo: total 11900, IVA 19 → neto 10000, iva 1900
  const { data: g1, error: ge1 } = await sb.rpc('registrar_gasto', {
    p_categoria_gasto_id: catInsumos, p_descripcion: 'Café en grano', p_monto_total: 11900,
    p_tasa_iva: 19, p_proveedor_id: prov.id, p_pagar_efectivo: true, p_sesion_caja_id: sesionId,
  });
  if (ge1) throw ge1;
  const { data: gasto1 } = await sb.from('gastos').select('monto_neto, monto_iva, monto_total, sesion_caja_id').eq('id', g1).single();
  check('gasto efectivo: neto 10000', approx(gasto1.monto_neto, 10000), JSON.stringify(gasto1));
  check('gasto efectivo: iva 1900', approx(gasto1.monto_iva, 1900), JSON.stringify(gasto1));
  check('gasto efectivo: sesion enlazada', gasto1.sesion_caja_id === sesionId);

  const { data: movG } = await sb.from('movimientos_caja').select('tipo, monto, gasto_id').eq('gasto_id', g1);
  check('gasto efectivo: movimiento de caja -11900', movG?.length === 1 && movG[0].tipo === 'gasto' && approx(movG[0].monto, -11900), JSON.stringify(movG));

  // gasto NO efectivo: total 5000, sin IVA → sin movimiento de caja, sin sesión
  const { data: g2, error: ge2 } = await sb.rpc('registrar_gasto', {
    p_categoria_gasto_id: catInsumos, p_descripcion: 'Transferencia arriendo', p_monto_total: 5000,
    p_tasa_iva: 0, p_pagar_efectivo: false,
  });
  if (ge2) throw ge2;
  const { data: gasto2 } = await sb.from('gastos').select('sesion_caja_id, monto_total').eq('id', g2).single();
  check('gasto no-efectivo: sin sesión', gasto2.sesion_caja_id === null, JSON.stringify(gasto2));
  const { data: movG2 } = await sb.from('movimientos_caja').select('id').eq('gasto_id', g2);
  check('gasto no-efectivo: sin movimiento de caja', (movG2?.length ?? 0) === 0);

  // cerrar caja: esperado = 50000 - 11900 = 38100
  const { data: cuadr } = await sb.rpc('cerrar_caja', { p_sesion_id: sesionId, p_monto_contado: 38100 });
  check('caja descuenta el gasto efectivo: esperado 38100', approx(cuadr.esperado, 38100), JSON.stringify(cuadr));
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación Fase 4A ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
