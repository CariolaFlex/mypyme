// Verificación e2e Fase 4B: órdenes de compra (crear/aprobar/recibir parcial y
// total) + impacto en inventario + cancelación. Crea empresa de prueba y limpia.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-4b-${Date.now()}@example.com`, PASS = 'Test1234!';
let userId, empresaId, ok = true;
const results = [];
const approx = (a, b, t = 0.01) => Math.abs(Number(a) - Number(b)) <= t;
const check = (n, c, e = '') => { results.push({ n, c: !!c, e }); if (!c) ok = false; };

try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (ue) throw ue;
  userId = u.user.id;
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'OC Test 4B', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  const { data: prods } = await sb.from('productos').insert([
    { empresa_id: empresaId, sku: 'P1', nombre: 'Prod 1', precio_total: 0, tasa_iva: 19, controla_stock: true },
    { empresa_id: empresaId, sku: 'P2', nombre: 'Prod 2', precio_total: 0, tasa_iva: 0, controla_stock: true },
  ]).select('id, sku');
  const p1 = prods.find((p) => p.sku === 'P1').id;
  const p2 = prods.find((p) => p.sku === 'P2').id;
  const { data: prov } = await sb.from('proveedores').insert({ empresa_id: empresaId, nombre: 'Prov 4B' }).select('id').single();

  // crear OC: P1 ×10 @1000 (iva19), P2 ×5 @2000 (iva0)
  const { data: ocId, error: ce } = await sb.rpc('crear_orden_compra', {
    p_proveedor_id: prov.id,
    p_lineas: [
      { producto_id: p1, cantidad: 10, costo_neto_unit: 1000, tasa_iva: 19 },
      { producto_id: p2, cantidad: 5, costo_neto_unit: 2000, tasa_iva: 0 },
    ],
  });
  if (ce) throw ce;
  const { data: oc } = await sb.from('ordenes_compra').select('estado, monto_neto, monto_iva, monto_total').eq('id', ocId).single();
  check('OC creada en borrador', oc.estado === 'borrador', oc.estado);
  check('OC total neto 20000', approx(oc.monto_neto, 20000, 1), `got ${oc.monto_neto}`);
  check('OC total IVA 1900', approx(oc.monto_iva, 1900, 1), `got ${oc.monto_iva}`);
  check('OC total 21900', approx(oc.monto_total, 21900, 1), `got ${oc.monto_total}`);

  const { data: lineas } = await sb.from('ordenes_compra_lineas').select('id, producto_id, cantidad').eq('orden_compra_id', ocId);
  const l1 = lineas.find((l) => l.producto_id === p1).id;
  const l2 = lineas.find((l) => l.producto_id === p2).id;

  // no se puede recibir sin aprobar
  const recSinAprobar = await sb.rpc('recibir_orden_compra', { p_oc_id: ocId, p_recepciones: [{ linea_id: l1, cantidad: 1 }] });
  check('no recibe sin aprobar', !!recSinAprobar.error, recSinAprobar.error?.code);

  // aprobar
  const { error: ae } = await sb.rpc('aprobar_orden_compra', { p_oc_id: ocId });
  check('aprobar OC', !ae, ae?.message);

  // recepción parcial: P1 full (10), P2 parcial (2)
  const { data: e1, error: re1 } = await sb.rpc('recibir_orden_compra', {
    p_oc_id: ocId, p_recepciones: [{ linea_id: l1, cantidad: 10 }, { linea_id: l2, cantidad: 2 }],
  });
  if (re1) throw re1;
  check('estado tras recepción parcial', e1 === 'recibida_parcial', e1);

  // recibir de más debe fallar (P2 pendiente 3, pido 5)
  const recDeMas = await sb.rpc('recibir_orden_compra', { p_oc_id: ocId, p_recepciones: [{ linea_id: l2, cantidad: 5 }] });
  check('rechaza recibir más de lo pendiente', !!recDeMas.error, recDeMas.error?.code);

  // recibir resto P2 (3) → recibida
  const { data: e2 } = await sb.rpc('recibir_orden_compra', { p_oc_id: ocId, p_recepciones: [{ linea_id: l2, cantidad: 3 }] });
  check('estado tras recepción total', e2 === 'recibida', e2);

  // stock final desde la vista: P1=10, P2=5
  const { data: stock } = await sb.from('vw_stock_actual').select('producto_id, stock');
  const sP1 = stock.find((s) => s.producto_id === p1)?.stock ?? 0;
  const sP2 = stock.find((s) => s.producto_id === p2)?.stock ?? 0;
  check('stock P1 = 10', approx(sP1, 10), `got ${sP1}`);
  check('stock P2 = 5', approx(sP2, 5), `got ${sP2}`);

  // movimientos tipo compra con costo
  const { data: movs } = await sb.from('movimientos_inventario').select('tipo, costo_unitario, orden_compra_linea_id').eq('tipo', 'compra');
  check('movimientos de compra con OC y costo', movs.length === 3 && movs.every((m) => m.orden_compra_linea_id && Number(m.costo_unitario) > 0), JSON.stringify(movs.map((m) => m.costo_unitario)));

  // no se puede cancelar una OC ya recibida
  const cancelRecibida = await sb.rpc('cancelar_orden_compra', { p_oc_id: ocId });
  check('no cancela OC con recepciones', !!cancelRecibida.error, cancelRecibida.error?.code);

  // crear otra OC y cancelarla en borrador
  const { data: oc2 } = await sb.rpc('crear_orden_compra', { p_proveedor_id: prov.id, p_lineas: [{ producto_id: p1, cantidad: 1, costo_neto_unit: 500, tasa_iva: 0 }] });
  const { error: cce } = await sb.rpc('cancelar_orden_compra', { p_oc_id: oc2 });
  const { data: oc2row } = await sb.from('ordenes_compra').select('estado').eq('id', oc2).single();
  check('cancelar OC en borrador', !cce && oc2row.estado === 'cancelada', oc2row?.estado);
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación Fase 4B ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
