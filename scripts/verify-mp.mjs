// Verificación e2e: Mercado Pago Point (Fase 1).
// Cubre lo testeable sin hardware: objetos de la migración, registrar_venta_mp
// (registra la venta vía process_sale_core, idempotente), aislamiento RLS por
// tenant, revoke de las columnas de token, y regresión de process_sale (wrapper).
// Las llamadas a la API de MP NO se tocan (requieren device físico). Limpia al final.
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

const results = [];
let ok = true;
const check = (n, c, e = '') => { results.push({ n, c: !!c, e }); if (!c) ok = false; };

// Helper: crea empresa + usuario admin logueado (sb con JWT del tenant).
async function nuevaEmpresa(rut, nombre, email) {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email, password: 'Test1234!', email_confirm: true });
  if (ue) throw ue;
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email, password: 'Test1234!' });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: rut, p_razon_social: nombre, p_usa_iva: true });
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });
  return { userId: u.user.id, empresaId: eid, sb };
}

const limpiar = [];
try {
  // ── Empresa A ───────────────────────────────────────────────────────────
  const A = await nuevaEmpresa('60000000-4', 'MP Test A', `mp-a-${Date.now()}@example.com`);
  limpiar.push(A);

  // Producto $1.000, controla stock, stock inicial 10.
  const { data: bodega } = await A.sb.from('bodegas').select('id').eq('es_default', true).single();
  const { data: prod } = await A.sb.from('productos')
    .insert({ empresa_id: A.empresaId, sku: 'MP-PROD', nombre: 'Producto MP', precio_total: 1000, precio_neto: 1000, tasa_iva: 0, controla_stock: true })
    .select('id').single();
  await A.sb.from('movimientos_inventario').insert({ empresa_id: A.empresaId, producto_id: prod.id, bodega_id: bodega.id, cantidad: 10, tipo: 'ajuste' });

  // Método de pago mercadopago_point (tipo ≠ cash → no toca caja).
  const { data: metodo, error: me } = await A.sb.from('metodos_pago')
    .insert({ empresa_id: A.empresaId, nombre: 'Mercado Pago Point', tipo: 'mercadopago_point' })
    .select('id').single();
  check('metodos_pago acepta tipo mercadopago_point', !me, me?.message);

  // ── Conexión + tablas existen (insert vía service_role) ──────────────────
  const { error: ce } = await admin.from('mp_conexiones').insert({
    empresa_id: A.empresaId, mp_user_id: '123', access_token_cifrado: 'iv.tag.data', refresh_token_cifrado: 'iv.tag.data', estado: 'conectada',
  });
  check('mp_conexiones existe e inserta', !ce, ce?.message);

  const { error: de } = await admin.from('mp_dispositivos').insert({
    empresa_id: A.empresaId, device_id: 'DEVICE-A', estado: 'activo',
  });
  check('mp_dispositivos existe e inserta', !de, de?.message);

  // ── mp_cobros con payload de venta + registrar_venta_mp ──────────────────
  const ventaId = randomUUID();
  const { data: cobro, error: coe } = await admin.from('mp_cobros').insert({
    empresa_id: A.empresaId,
    venta_id: ventaId,
    payment_intent_id: 'INTENT-A-1',
    device_id: 'DEVICE-A',
    monto: 2000,
    estado: 'pending',
    payload: { lineas: [{ producto_id: prod.id, cantidad: 2 }], pagos: [{ metodo_pago_id: metodo.id, monto: 2000 }], sesion_caja_id: null },
  }).select('id').single();
  check('mp_cobros existe e inserta payload', !coe, coe?.message);

  const { data: ventaRet, error: re } = await admin.rpc('registrar_venta_mp', { p_cobro_id: cobro.id });
  check('registrar_venta_mp registra la venta', !re && ventaRet === ventaId, re?.message);

  const { data: venta } = await admin.from('ventas').select('monto_total').eq('id', ventaId).maybeSingle();
  check('venta registrada con total $2.000', venta && Math.abs(Number(venta.monto_total) - 2000) <= 1, JSON.stringify(venta));

  const { data: movs } = await admin.from('movimientos_inventario').select('cantidad').eq('producto_id', prod.id);
  const stock = movs.reduce((s, m) => s + Number(m.cantidad), 0);
  check('stock descontado: 10 − 2 = 8', Math.abs(stock - 8) < 0.0001, `stock=${stock}`);

  const { data: cob2 } = await admin.from('mp_cobros').select('estado').eq('id', cobro.id).single();
  check('mp_cobros marcado approved', cob2.estado === 'approved', cob2.estado);

  // Idempotencia: re-llamar no duplica la venta.
  await admin.rpc('registrar_venta_mp', { p_cobro_id: cobro.id });
  const { count } = await admin.from('ventas').select('id', { count: 'exact', head: true }).eq('id', ventaId);
  check('registrar_venta_mp es idempotente (1 venta)', count === 1, `count=${count}`);

  // ── Regresión: process_sale (wrapper) sigue registrando con el JWT ───────
  const { data: cash } = await A.sb.from('metodos_pago').select('id').eq('tipo', 'cash').limit(1).single();
  const ventaCash = randomUUID();
  const { error: pse } = await A.sb.rpc('process_sale', {
    p_venta_id: ventaCash,
    p_lineas: [{ producto_id: prod.id, cantidad: 1 }],
    p_pagos: [{ metodo_pago_id: cash.id, monto: 1000 }],
  });
  check('process_sale (wrapper DEFINER) sigue funcionando', !pse, pse?.message);

  // ── Aislamiento RLS: empresa B no ve los cobros de A ─────────────────────
  const B = await nuevaEmpresa('77815460-9', 'MP Test B', `mp-b-${Date.now()}@example.com`);
  limpiar.push(B);
  const { data: cobrosB } = await B.sb.from('mp_cobros').select('id');
  check('RLS: empresa B no ve cobros de A', (cobrosB?.length ?? 0) === 0, `vistos=${cobrosB?.length}`);

  // ── Revoke de columnas de token: el tenant no puede leerlas ──────────────
  const { error: tokErr } = await A.sb.from('mp_conexiones').select('access_token_cifrado').maybeSingle();
  check('columna access_token_cifrado revocada a authenticated', !!tokErr, 'el tenant pudo leer el token');
  const { error: okErr } = await A.sb.from('mp_conexiones').select('estado').maybeSingle();
  check('el tenant SÍ puede leer estado (no-token)', !okErr, okErr?.message);
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  for (const t of limpiar) {
    if (t.empresaId) await admin.from('empresas').delete().eq('id', t.empresaId);
    if (t.userId) await admin.auth.admin.deleteUser(t.userId);
  }
}

console.log('\n=== Verificación Mercado Pago Point (Fase 1) ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
