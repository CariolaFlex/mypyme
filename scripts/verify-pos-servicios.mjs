// Verifica e2e (contra la DB cloud) el POS de servicios:
//   - línea de catálogo + cobro manual (línea libre sin producto)
//   - descuento total (reparto proporcional neto/IVA)
//   - nota de la venta
// Crea una empresa demo efímera, hace una venta real vía process_sale (con el JWT
// del usuario → wrapper DEFINER), lee la venta y sus líneas, valida montos y limpia.
//
//   node scripts/verify-pos-servicios.mjs
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
if (!URL_ || !ANON || !SVC) { console.error('Faltan envs en .env.local'); process.exit(1); }

const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });

let passed = 0, failed = 0;
const ok = (name, cond, extra = '') => { if (cond) passed++; else failed++; console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`); };
const near = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;

const EMAIL = `verify-pos-${Date.now()}@example.com`;
const PASS = crypto.randomUUID();
let userId = null;

// RUT válido al azar (cuerpo 10-24M + DV Módulo 11) para no chocar con el UNIQUE.
function genRut() {
  const n = 10_000_000 + Math.floor(Math.random() * 15_000_000);
  let sum = 0, mul = 2;
  for (const d of String(n).split('').reverse()) { sum += Number(d) * mul; mul = mul === 7 ? 2 : mul + 1; }
  const r = 11 - (sum % 11);
  const dv = r === 11 ? '0' : r === 10 ? 'K' : String(r);
  return `${n}-${dv}`;
}

try {
  const { data: u, error: eu } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (eu) throw eu;
  userId = u.user.id;

  const { data: s1, error: es1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (es1) throw es1;
  const { data: empresaId, error: ee } = await sb.rpc('crear_empresa_y_membresia', {
    p_rut: genRut(), p_razon_social: 'Verify POS Servicios', p_usa_iva: true,
  });
  if (ee) throw ee;
  // Refrescar para que el JWT traiga empresa_id (lo usa process_sale).
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  // Producto de catálogo afecto (IVA 19), precio c/IVA 2500.
  const { data: prod, error: ep } = await sb.from('productos').insert({
    empresa_id: empresaId, sku: 'CAPP', nombre: 'Cappuccino',
    precio_total: 2500, precio_neto: 2101, tasa_iva: 19, controla_stock: false,
  }).select('id').single();
  if (ep) throw ep;

  await sb.rpc('abrir_caja', { p_monto_apertura: 0 });
  const { data: sesion } = await sb.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle();

  // Venta: 1 Cappuccino ($2500) + cobro manual "Sesión" ($5000, IVA 19% incl.)
  //        − descuento $1500. Bruto 7500 → total 6000.
  const ventaId = crypto.randomUUID();
  const { error: erpc } = await sb.rpc('process_sale', {
    p_venta_id: ventaId,
    p_lineas: [
      { producto_id: prod.id, cantidad: 1 },
      { descripcion: 'Sesión kinesiología', precio: 5000, cantidad: 1, tasa_iva: 19 },
    ],
    p_pagos: [{ metodo_pago_id: (await metodoCash(sb)), monto: 6000, monto_recibido: 6000 }],
    p_sesion_caja_id: sesion?.id ?? null,
    p_descuento: 1500,
    p_nota: 'Cliente: Juan Pérez',
  });
  if (erpc) throw erpc;

  const { data: venta } = await sb.from('ventas')
    .select('monto_total, monto_neto, monto_iva, descuento, nota, vuelto').eq('id', ventaId).single();
  const { data: lineas } = await sb.from('ventas_lineas')
    .select('producto_id, descripcion, monto_total').eq('venta_id', ventaId).order('monto_total');

  ok('total = 6000 (7500 − 1500 descuento)', near(venta.monto_total, 6000));
  ok('descuento persistido = 1500', near(venta.descuento, 1500));
  ok('neto+IVA = total (reparto proporcional)', near(Number(venta.monto_neto) + Number(venta.monto_iva), venta.monto_total));
  ok('IVA > 0 (cobro manual afecto suma débito)', Number(venta.monto_iva) > 0, `IVA=${venta.monto_iva}`);
  ok('nota persistida', venta.nota === 'Cliente: Juan Pérez');
  ok('2 líneas registradas', (lineas?.length ?? 0) === 2);
  ok('línea manual sin producto_id + con descripción',
    !!lineas?.some((l) => l.producto_id === null && l.descripcion === 'Sesión kinesiología'));
  ok('línea de catálogo con producto_id', !!lineas?.some((l) => l.producto_id === prod.id));

  // Idempotencia: reenviar el mismo ventaId no duplica.
  await sb.rpc('process_sale', {
    p_venta_id: ventaId, p_lineas: [{ producto_id: prod.id, cantidad: 1 }],
    p_pagos: [{ metodo_pago_id: (await metodoCash(sb)), monto: 6000 }],
    p_sesion_caja_id: sesion?.id ?? null,
  });
  const { count } = await sb.from('ventas').select('id', { count: 'exact', head: true }).eq('id', ventaId);
  ok('idempotente (no duplica la venta)', count === 1);
} catch (e) {
  failed++;
  console.error('✗ EXCEPCIÓN:', e.message || e);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId); // cascada borra empresa + venta
}

async function metodoCash(client) {
  const { data } = await client.from('metodos_pago').select('id').eq('tipo', 'cash').limit(1).maybeSingle();
  return data?.id ?? null;
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
