// Verificación e2e Fase 4C: facturas de proveedor + pagos (parcial/total),
// pago efectivo que descuenta caja, validaciones. Crea empresa de prueba y limpia.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-4c-${Date.now()}@example.com`, PASS = 'Test1234!';
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
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'CxP Test 4C', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  const { data: prov } = await sb.from('proveedores').insert({ empresa_id: empresaId, nombre: 'Prov 4C' }).select('id').single();
  const { data: mps } = await sb.from('metodos_pago').select('id, tipo');
  const efectivo = mps.find((m) => m.tipo === 'cash').id;
  const transferencia = mps.find((m) => m.tipo === 'transfer').id;
  const { data: sesionId } = await sb.rpc('abrir_caja', { p_monto_apertura: 100000 });

  // factura total 119000 IVA 19 → neto 100000, iva 19000
  const { data: facId, error: fe } = await sb.rpc('crear_factura_proveedor', {
    p_proveedor_id: prov.id, p_numero_factura: 'F-001', p_monto_total: 119000, p_tasa_iva: 19,
  });
  if (fe) throw fe;
  const { data: fac } = await sb.from('facturas_proveedor').select('monto_neto, monto_iva, saldo, estado').eq('id', facId).single();
  check('factura neto 100000', approx(fac.monto_neto, 100000), JSON.stringify(fac));
  check('factura iva 19000', approx(fac.monto_iva, 19000), JSON.stringify(fac));
  check('factura saldo inicial 119000', approx(fac.saldo, 119000), JSON.stringify(fac));
  check('factura estado pendiente', fac.estado === 'pendiente', fac.estado);

  // pago parcial 50000 en efectivo
  const { data: pago1, error: pe1 } = await sb.rpc('registrar_pago_proveedor', {
    p_factura_id: facId, p_monto: 50000, p_metodo_pago_id: efectivo, p_pagar_efectivo: true, p_sesion_caja_id: sesionId,
  });
  if (pe1) throw pe1;
  const { data: fac2 } = await sb.from('facturas_proveedor').select('saldo, estado').eq('id', facId).single();
  check('tras pago parcial: saldo 69000', approx(fac2.saldo, 69000), JSON.stringify(fac2));
  check('tras pago parcial: estado pago_parcial', fac2.estado === 'pago_parcial', fac2.estado);
  const { data: movP } = await sb.from('movimientos_caja').select('tipo, monto, pago_proveedor_id').eq('pago_proveedor_id', pago1);
  check('pago efectivo: movimiento de caja -50000', movP?.length === 1 && movP[0].tipo === 'pago_proveedor' && approx(movP[0].monto, -50000), JSON.stringify(movP));

  // pago de más que el saldo → error
  const pagoExceso = await sb.rpc('registrar_pago_proveedor', { p_factura_id: facId, p_monto: 999999, p_metodo_pago_id: transferencia });
  check('rechaza pago mayor al saldo', !!pagoExceso.error, pagoExceso.error?.code);

  // pago del resto 69000 por transferencia (no efectivo) → pagada, sin caja
  const { data: pago2, error: pe2 } = await sb.rpc('registrar_pago_proveedor', {
    p_factura_id: facId, p_monto: 69000, p_metodo_pago_id: transferencia, p_pagar_efectivo: false,
  });
  if (pe2) throw pe2;
  const { data: fac3 } = await sb.from('facturas_proveedor').select('saldo, estado').eq('id', facId).single();
  check('tras pago total: saldo 0', approx(fac3.saldo, 0), JSON.stringify(fac3));
  check('tras pago total: estado pagada', fac3.estado === 'pagada', fac3.estado);
  const { data: movP2 } = await sb.from('movimientos_caja').select('id').eq('pago_proveedor_id', pago2);
  check('pago no-efectivo: sin movimiento de caja', (movP2?.length ?? 0) === 0);

  // no se puede pagar una factura ya pagada
  const pagoPagada = await sb.rpc('registrar_pago_proveedor', { p_factura_id: facId, p_monto: 1000, p_metodo_pago_id: transferencia });
  check('rechaza pagar factura pagada', !!pagoPagada.error, pagoPagada.error?.code);

  // caja: esperado = 100000 - 50000 (solo el pago efectivo)
  const { data: cuadr } = await sb.rpc('cerrar_caja', { p_sesion_id: sesionId, p_monto_contado: 50000 });
  check('caja descuenta solo el pago efectivo: esperado 50000', approx(cuadr.esperado, 50000), JSON.stringify(cuadr));
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación Fase 4C ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
