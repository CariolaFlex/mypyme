// Verificación e2e del F29 completo: IVA débito (ventas) y crédito (gastos).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-iva-${Date.now()}@example.com`, PASS = 'Test1234!';
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
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'IVA Test F29', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  const { data: prods } = await sb.from('productos').insert([
    { empresa_id: empresaId, sku: 'P', nombre: 'Prod', precio_total: 11900, precio_neto: 10000, tasa_iva: 19, controla_stock: false },
  ]).select('id');
  const { data: mps } = await sb.from('metodos_pago').select('id, tipo');
  const { data: cats } = await sb.from('categorias_gasto').select('id').limit(1);

  // venta: total 11900 → IVA débito 1900
  await sb.rpc('process_sale', {
    p_venta_id: randomUUID(),
    p_lineas: [{ producto_id: prods[0].id, cantidad: 1 }],
    p_pagos: [{ metodo_pago_id: mps.find((m) => m.tipo === 'card').id, monto: 11900 }],
    p_usuario_id: userId,
  });
  // gasto: total 5950 tasa 19 → IVA crédito 950
  await sb.rpc('registrar_gasto', {
    p_categoria_gasto_id: cats[0].id, p_descripcion: 'Insumo', p_monto_total: 5950, p_tasa_iva: 19,
  });

  const anio = new Date().getFullYear();
  const { data: deb } = await sb.rpc('reporte_iva_mensual', { p_anio: anio });
  const { data: cre } = await sb.rpc('reporte_iva_credito_mensual', { p_anio: anio });
  const totDeb = (deb ?? []).reduce((s, f) => s + Number(f.iva_debito), 0);
  const totCre = (cre ?? []).reduce((s, f) => s + Number(f.iva_credito), 0);

  check('IVA débito (ventas) == 1900', approx(totDeb, 1900), `got ${totDeb}`);
  check('IVA crédito (gastos) == 950', approx(totCre, 950), `got ${totCre}`);
  check('Resultado F29 (débito - crédito) == 950', approx(totDeb - totCre, 950), `got ${totDeb - totCre}`);
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación F29 (débito + crédito) ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
