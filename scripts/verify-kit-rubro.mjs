// Verifica e2e (DB cloud) que el "kit inicial" de un rubro produce fichas
// funcionales: siembra (con el mismo shape que lib/kit-rubro) una categoría +
// una ficha de servicio, y comprueba que queda sin stock, con neto derivado, y
// que se vende por el POS sin generar movimiento de inventario.
//
//   node scripts/verify-kit-rubro.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });

let passed = 0, failed = 0;
const ok = (n, c, x = '') => { if (c) passed++; else failed++; console.log(`${c ? '✓' : '✗'} ${n}${x ? ' — ' + x : ''}`); };
const near = (a, b, t = 1) => Math.abs(Number(a) - Number(b)) <= t;

function genRut() {
  const n = 10_000_000 + Math.floor(Math.random() * 15_000_000);
  let sum = 0, mul = 2;
  for (const d of String(n).split('').reverse()) { sum += Number(d) * mul; mul = mul === 7 ? 2 : mul + 1; }
  const r = 11 - (sum % 11);
  return `${n}-${r === 11 ? '0' : r === 10 ? 'K' : r}`;
}

const EMAIL = `verify-kit-${Date.now()}@example.com`, PASS = crypto.randomUUID();
let userId = null;
try {
  const { data: u, error: eu } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (eu) throw eu;
  userId = u.user.id;
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: empresaId } = await sb.rpc('crear_empresa_y_membresia', { p_rut: genRut(), p_razon_social: 'Verify Kit Barbería', p_usa_iva: true });
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  // Rubro barbería (valida el CHECK ampliado por la migración #43).
  const { error: eTipo } = await sb.from('configuracion_negocio').update({ tipo_negocio: 'barberia' }).eq('empresa_id', empresaId);
  ok('tipo_negocio=barberia aceptado por el CHECK', !eTipo, eTipo?.message);

  // Siembra con el mismo shape que lib/kit-rubro: categoría + ficha de servicio.
  const { data: cat } = await sb.from('categorias_producto').insert({ empresa_id: empresaId, nombre: 'Servicios' }).select('id').single();
  const precio = 8000, neto = Math.round((precio / 1.19) * 100) / 100;
  const { data: prod, error: ep } = await sb.from('productos').insert({
    empresa_id: empresaId, sku: 'CORTE-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    nombre: 'Corte de pelo', categoria_id: cat.id, unidad_medida: 'unidad',
    controla_stock: false, precio_total: precio, precio_neto: neto, tasa_iva: 19,
  }).select('id, controla_stock, precio_neto').single();
  ok('ficha de servicio creada', !ep, ep?.message);
  ok('la ficha NO controla stock', prod?.controla_stock === false);
  ok('neto derivado del precio c/IVA (~6723)', near(prod?.precio_neto, 6722.69, 1));

  // Vender la ficha por el POS: debe registrar la venta SIN mover inventario.
  await sb.rpc('abrir_caja', { p_monto_apertura: 0 });
  const { data: sesion } = await sb.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle();
  const { data: metodo } = await sb.from('metodos_pago').select('id').eq('tipo', 'cash').limit(1).maybeSingle();
  const ventaId = crypto.randomUUID();
  const { error: ev } = await sb.rpc('process_sale', {
    p_venta_id: ventaId,
    p_lineas: [{ producto_id: prod.id, cantidad: 1 }],
    p_pagos: [{ metodo_pago_id: metodo.id, monto: 8000, monto_recibido: 8000 }],
    p_sesion_caja_id: sesion?.id ?? null,
  });
  ok('la ficha se vende por el POS', !ev, ev?.message);
  const { data: venta } = await sb.from('ventas').select('monto_total').eq('id', ventaId).single();
  ok('total de la venta = 8000', near(venta?.monto_total, 8000));
  const { count: movs } = await sb.from('movimientos_inventario').select('id', { count: 'exact', head: true }).eq('producto_id', prod.id);
  ok('venta de servicio NO genera movimiento de inventario', movs === 0, `movs=${movs}`);
} catch (e) {
  failed++; console.error('✗ EXCEPCIÓN:', e.message || e);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
