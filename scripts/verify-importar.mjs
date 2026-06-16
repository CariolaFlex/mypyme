// Verificación e2e de importar_catalogo (Fase 7 - carga inicial).
// Importa una lista con categorías repetidas, nombres duplicados (dedup de SKU),
// y stock opcional; valida derivación de neto, creación de categorías, stock
// inicial, controla_stock y la guarda de admin. LIMPIA todo al final.
//
// Uso: node scripts/verify-importar.mjs
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
const OWNER = `imp-owner-${t}@example.com`;
const EMP = `imp-emp-${t}@example.com`;
const PASS = 'Test1234!';
const approx = (a, b, tol = 0.05) => Math.abs(Number(a) - Number(b)) <= tol;

let owner, emp, empresa, ok = true;
const results = [];
function check(name, cond, extra = '') { results.push({ name, pass: !!cond, extra }); if (!cond) ok = false; }

try {
  const { data: ou } = await admin.auth.admin.createUser({ email: OWNER, password: PASS, email_confirm: true });
  owner = ou.user.id;
  const sb = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: s } = await sb.auth.signInWithPassword({ email: OWNER, password: PASS });
  const { data: eid, error: oe } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '12345678-5', p_razon_social: 'Negocio Import', p_usa_iva: true });
  if (oe) throw oe;
  empresa = eid;
  await sb.auth.refreshSession({ refresh_token: s.session.refresh_token });

  const items = [
    { nombre: 'Cappuccino', precio_total: 2500, categoria: 'Cafés', stock: null },
    { nombre: 'Espresso', precio_total: 1800, categoria: 'Cafés', stock: null },
    { nombre: 'Café', precio_total: 2000, categoria: 'Cafés', stock: null },   // sku CAFE
    { nombre: 'Café', precio_total: 2200, categoria: 'Cafés', stock: 10 },      // sku dedup
    { nombre: 'Croissant', precio_total: 1900, categoria: 'Pastelería', stock: 30 },
    { nombre: 'Agua mineral', precio_total: 1200, categoria: 'Bebidas', stock: 48 },
  ];

  const { data: res, error: ie } = await sb.rpc('importar_catalogo', { p_items: items });
  if (ie) throw ie;
  check('creados == 6', (res?.creados) === 6, JSON.stringify(res));

  // productos
  const { data: prods } = await sb.from('productos').select('id, sku, nombre, precio_neto, precio_total, tasa_iva, controla_stock, categoria_id');
  check('6 productos en DB', prods.length === 6, `got ${prods.length}`);

  const capp = prods.find((p) => p.nombre === 'Cappuccino');
  check('neto derivado de 2500/1.19 ≈ 2100.84', capp && approx(capp.precio_neto, 2100.84, 0.5), JSON.stringify(capp));
  check('tasa_iva == 19', capp && Number(capp.tasa_iva) === 19, JSON.stringify(capp));

  const cafes = prods.filter((p) => p.nombre === 'Café');
  check('2 productos "Café"', cafes.length === 2, JSON.stringify(cafes.map((c) => c.sku)));
  check('SKUs distintos (dedup)', cafes.length === 2 && cafes[0].sku !== cafes[1].sku, JSON.stringify(cafes.map((c) => c.sku)));

  check('Cappuccino sin stock → controla_stock false', capp && capp.controla_stock === false, JSON.stringify(capp));
  const crois = prods.find((p) => p.nombre === 'Croissant');
  check('Croissant con stock → controla_stock true', crois && crois.controla_stock === true, JSON.stringify(crois));

  // categorías dedup: Cafés, Pastelería, Bebidas = 3 (NO 4 aunque Cafés se repite)
  const { data: cats } = await sb.from('categorias_producto').select('id, nombre');
  check('3 categorías creadas (Cafés dedup)', cats.length === 3, JSON.stringify(cats.map((c) => c.nombre)));

  // stock inicial
  const { data: stockRows } = await sb.from('vw_stock_actual').select('producto_id, stock');
  const stockDe = (nombre) => {
    const p = prods.find((x) => x.nombre === nombre);
    return stockRows.filter((r) => r.producto_id === p.id).reduce((s, r) => s + Number(r.stock), 0);
  };
  check('stock Croissant == 30', approx(stockDe('Croissant'), 30, 0.001), `got ${stockDe('Croissant')}`);
  check('stock Agua == 48', approx(stockDe('Agua mineral'), 48, 0.001), `got ${stockDe('Agua mineral')}`);
  check('Cappuccino sin movimiento de stock', stockRows.filter((r) => r.producto_id === capp.id).length === 0, '');

  // guarda admin: empleado no puede importar
  emp = (await admin.auth.admin.createUser({ email: EMP, password: PASS, email_confirm: true })).data.user.id;
  await admin.from('usuarios_empresa').insert({ usuario_id: emp, empresa_id: empresa, rol: 'empleado' });
  const sbE = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: sE } = await sbE.auth.signInWithPassword({ email: EMP, password: PASS });
  await sbE.auth.refreshSession({ refresh_token: sE.session.refresh_token });
  const { error: gErr } = await sbE.rpc('importar_catalogo', { p_items: [{ nombre: 'X', precio_total: 100 }] });
  check('empleado NO puede importar', !!gErr, gErr ? 'rechazó OK' : 'permitió (MAL)');

  // array vacío rechazado
  const { error: vErr } = await sb.rpc('importar_catalogo', { p_items: [] });
  check('array vacío rechazado', !!vErr, vErr ? 'rechazó OK' : 'permitió (MAL)');
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresa) await admin.from('empresas').delete().eq('id', empresa);
  if (owner) await admin.auth.admin.deleteUser(owner);
  if (emp) await admin.auth.admin.deleteUser(emp);
}

console.log('\n=== Resultados verificación importar catálogo ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
