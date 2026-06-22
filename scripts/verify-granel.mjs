// Verificación e2e: venta a granel / por peso (cantidad decimal en process_sale).
// Crea empresa + producto granel ($8.000/kg), carga stock 5 kg, vende 0,350 kg y
// comprueba que la línea cuadra ($2.800) y el stock baja a 4,650 kg. Limpia al final.
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

const EMAIL = `test-granel-${Date.now()}@example.com`, PASS = 'Test1234!';
let userId, empresaId, ok = true;
const results = [];
const check = (n, c, e = '') => { results.push({ n, c: !!c, e }); if (!c) ok = false; };

try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (ue) throw ue;
  userId = u.user.id;
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '60000000-4', p_razon_social: 'Granel Test', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  const { data: bodega } = await sb.from('bodegas').select('id').eq('es_default', true).limit(1).single();
  const { data: metodo } = await sb.from('metodos_pago').select('id').eq('tipo', 'cash').limit(1).single();

  // ── Producto a granel: $8.000 por kg, controla stock ────────────────────
  const { data: prod, error: pe } = await sb.from('productos')
    .insert({ empresa_id: empresaId, sku: 'QUESO-KG', nombre: 'Queso a granel', granel: true,
      unidad_medida: 'kg', precio_total: 8000, precio_neto: 8000, tasa_iva: 0, controla_stock: true })
    .select('id, granel').single();
  check('producto granel creado (columna granel existe)', !pe && prod?.granel === true, pe?.message);

  // ── Stock inicial 5 kg ──────────────────────────────────────────────────
  await sb.from('movimientos_inventario').insert({
    empresa_id: empresaId, producto_id: prod.id, bodega_id: bodega.id, cantidad: 5, tipo: 'ajuste' });

  // ── Venta de 0,350 kg ───────────────────────────────────────────────────
  const ventaId = randomUUID();
  const { error: ve } = await sb.rpc('process_sale', {
    p_venta_id: ventaId,
    p_lineas: [{ producto_id: prod.id, cantidad: 0.35 }],
    p_pagos: [{ metodo_pago_id: metodo.id, monto: 2800 }],
  });
  check('process_sale con cantidad decimal', !ve, ve?.message);

  const { data: linea } = await sb.from('ventas_lineas')
    .select('cantidad, monto_total').eq('venta_id', ventaId).single();
  check('línea: cantidad = 0,350', Math.abs(Number(linea.cantidad) - 0.35) < 0.0001, JSON.stringify(linea));
  check('línea: total = $2.800 (8000 × 0,35)', Math.abs(Number(linea.monto_total) - 2800) <= 1, JSON.stringify(linea));

  // ── Stock resultante: 5 − 0,35 = 4,650 kg ───────────────────────────────
  const { data: movs } = await sb.from('movimientos_inventario').select('cantidad').eq('producto_id', prod.id);
  const stock = movs.reduce((s, m) => s + Number(m.cantidad), 0);
  check('stock fraccionado: 4,650 kg', Math.abs(stock - 4.65) < 0.0001, `stock=${stock}`);
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación venta a granel (cantidad decimal) ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
