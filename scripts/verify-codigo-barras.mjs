// Verificación e2e de la columna productos.codigo_barras (Etapa 1 — escáner).
// Token real de un tenant de prueba (RLS aplica). Crea empresa y LIMPIA al final.
// Cubre: insertar con código, lookup por código, único por empresa (23505),
// múltiples NULL permitidos (índice parcial), edición del código.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-barcode-${Date.now()}@example.com`, PASS = 'Test1234!';
let userId, empresaId, ok = true;
const results = [];
const check = (n, c, e = '') => { results.push({ n, c: !!c, e }); if (!c) ok = false; };

try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (ue) throw ue;
  userId = u.user.id;
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '77815460-9', p_razon_social: 'Barcode Test', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  const EAN = '7801234567890';

  // ── Insertar producto con código de barras ──────────────────────────────
  const { data: p1, error: pe1 } = await sb.from('productos')
    .insert({ empresa_id: empresaId, sku: 'BAR-1', nombre: 'Bebida Cola', codigo_barras: EAN, precio_total: 1190, precio_neto: 1000, tasa_iva: 19 })
    .select('id, codigo_barras').single();
  check('producto: crear con codigo_barras', !pe1 && p1?.codigo_barras === EAN, pe1?.message);

  // ── Lookup por código (el flujo del scanner) ────────────────────────────
  const { data: hit } = await sb.from('productos').select('id, nombre').eq('codigo_barras', EAN).limit(1);
  check('lookup: encuentra el producto por su código', hit?.[0]?.id === p1.id, JSON.stringify(hit));

  // ── Único por empresa: otro producto con el MISMO código → 23505 ────────
  const { error: dup } = await sb.from('productos')
    .insert({ empresa_id: empresaId, sku: 'BAR-2', nombre: 'Duplicado', codigo_barras: EAN, precio_total: 990, precio_neto: 990, tasa_iva: 0 });
  check('único: mismo código en la empresa BLOQUEADO (23505)', dup?.code === '23505', dup ? dup.code : 'insertó sin bloquear');
  check('único: el mensaje 23505 menciona codigo_barras', dup?.code === '23505' && /codigo_barras/.test(dup.message || ''), dup?.message);

  // ── Índice parcial: múltiples productos SIN código (NULL) permitidos ────
  const { error: n1 } = await sb.from('productos').insert({ empresa_id: empresaId, sku: 'GRANEL-1', nombre: 'Dulce a granel', precio_total: 100, precio_neto: 100, tasa_iva: 0 });
  const { error: n2 } = await sb.from('productos').insert({ empresa_id: empresaId, sku: 'GRANEL-2', nombre: 'Galleta suelta', precio_total: 200, precio_neto: 200, tasa_iva: 0 });
  check('NULL: dos productos sin código (granel) conviven (índice parcial)', !n1 && !n2, n1?.message || n2?.message);

  // ── Editar el código de barras ──────────────────────────────────────────
  const { error: edu } = await sb.from('productos').update({ codigo_barras: '7809999999999' }).eq('id', p1.id);
  const { data: p1r } = await sb.from('productos').select('codigo_barras').eq('id', p1.id).single();
  check('producto: editar codigo_barras', !edu && p1r?.codigo_barras === '7809999999999', edu?.message);
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación codigo_barras (Etapa 1 — escáner) ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
