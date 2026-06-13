// Verificación e2e de pendientes 3B con impacto en backend:
//   - multi-pago en process_sale (varios métodos en una venta)
//   - movimientos de caja manuales (entrada/salida)
//   - cuadratura considerando ambos
// Crea empresa de prueba, abre caja, opera y LIMPIA al final.
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

const EMAIL = `test-3b-${Date.now()}@example.com`, PASS = 'Test1234!';
let userId, empresaId, ok = true;
const results = [];
const approx = (a, b, t = 1) => Math.abs(Number(a) - Number(b)) <= t;
const check = (name, cond, extra = '') => { results.push({ name, pass: !!cond, extra }); if (!cond) ok = false; };

try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (ue) throw ue;
  userId = u.user.id;

  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'Caja Test 3B', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  // producto $2500 sin IVA para montos redondos
  const { data: prods } = await sb.from('productos').insert([
    { empresa_id: empresaId, sku: 'X', nombre: 'Item', precio_total: 2500, precio_neto: 2500, tasa_iva: 0, controla_stock: false },
  ]).select('id');
  const prodId = prods[0].id;
  const { data: mps } = await sb.from('metodos_pago').select('id, tipo');
  const efectivo = mps.find((m) => m.tipo === 'cash').id;
  const tarjeta = mps.find((m) => m.tipo === 'card').id;

  // abrir caja con 10000
  const { data: sesionId, error: ae } = await sb.rpc('abrir_caja', { p_monto_apertura: 10000 });
  if (ae) throw ae;

  // venta multi-pago: 2× Item = 5000, pagado 3000 efectivo + 2000 tarjeta
  const ventaId = randomUUID();
  const { error: pe } = await sb.rpc('process_sale', {
    p_venta_id: ventaId,
    p_lineas: [{ producto_id: prodId, cantidad: 2 }],
    p_pagos: [
      { metodo_pago_id: efectivo, monto: 3000, monto_recibido: 3000 },
      { metodo_pago_id: tarjeta, monto: 2000, monto_recibido: 2000 },
    ],
    p_usuario_id: userId,
    p_sesion_caja_id: sesionId,
  });
  if (pe) throw pe;

  const { data: pagos } = await sb.from('ventas_pagos').select('monto').eq('venta_id', ventaId);
  check('multi-pago: 2 registros de pago', pagos?.length === 2, JSON.stringify(pagos));
  check('multi-pago: suma pagos == 5000', approx((pagos ?? []).reduce((s, p) => s + Number(p.monto), 0), 5000));

  // solo el efectivo entra a caja
  let { data: movs } = await sb.from('movimientos_caja').select('tipo, monto').eq('sesion_caja_id', sesionId);
  const ventaMovs = movs.filter((m) => m.tipo === 'venta');
  check('caja: solo el efectivo (3000) de la venta', ventaMovs.length === 1 && approx(ventaMovs[0].monto, 3000), JSON.stringify(ventaMovs));

  // movimientos manuales: entrada +4000, salida -1500 (igual que la server action)
  const { error: me } = await sb.from('movimientos_caja').insert([
    { empresa_id: empresaId, sesion_caja_id: sesionId, tipo: 'entrada_manual', monto: 4000, descripcion: 'fondo' },
    { empresa_id: empresaId, sesion_caja_id: sesionId, tipo: 'salida_manual', monto: -1500, descripcion: 'retiro' },
  ]);
  if (me) throw me;

  // cerrar caja: esperado = 10000 + 3000 + 4000 - 1500 = 15500
  const { data: cuadr, error: ce } = await sb.rpc('cerrar_caja', { p_sesion_id: sesionId, p_monto_contado: 15500 });
  if (ce) throw ce;
  check('cuadratura: esperado == 15500', approx(cuadr.esperado, 15500), JSON.stringify(cuadr));
  check('cuadratura: diferencia == 0', approx(cuadr.diferencia, 0), JSON.stringify(cuadr));
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación pendientes 3B ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
