// Verificación e2e del RPC reporte_ventas_por_cajero (pendiente menor Fase 5).
// Empresa A con DOS cajeros (user1 owner + user2 empleado) y ventas conocidas
// por cada uno; Empresa B con su propio cajero para probar aislamiento tenant.
// Asegura: split correcto por cajero, email resuelto, orden por total desc,
// que el cajero de B NO aparece en el reporte de A, y que anon no ejecuta.
// LIMPIA todo al final.
//
// Uso: node scripts/verify-cajero.mjs   (lee .env.local)
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

// --- cargar .env.local sin dependencias ---
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SVC) throw new Error('Faltan claves en .env.local');

const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

// RUTs válidos (Módulo 11) distintos para empresa A y B.
const RUT_A = '76192083-9';
const RUT_B = '77815460-9';
const t = Date.now();
const EMAIL1 = `cajero1-${t}@example.com`;   // owner empresa A
const EMAIL2 = `cajero2-${t}@example.com`;   // empleado empresa A
const EMAIL3 = `cajero3-${t}@example.com`;   // owner empresa B
const PASS = 'Test1234!';

let user1, user2, user3, empresaA, empresaB, ok = true;
const results = [];
const approx = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;
function check(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  if (!cond) ok = false;
}

async function nuevoUsuario(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}
function clienteLogueado() {
  return createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function login(sb, email) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: PASS });
  if (error) throw error;
  return data.session;
}

try {
  // ---- Empresa A: owner (user1) + onboarding ----
  user1 = await nuevoUsuario(EMAIL1);
  const sbA = clienteLogueado();
  const sA = await login(sbA, EMAIL1);
  const { data: eidA, error: oeA } = await sbA.rpc('crear_empresa_y_membresia', {
    p_rut: RUT_A, p_razon_social: 'Negocio A', p_usa_iva: true,
  });
  if (oeA) throw oeA;
  empresaA = eidA;
  await sbA.auth.refreshSession({ refresh_token: sA.session?.refresh_token ?? sA.refresh_token });

  // ---- user2: segundo cajero, miembro de empresa A (empleado) ----
  user2 = await nuevoUsuario(EMAIL2);
  const { error: mErr } = await admin.from('usuarios_empresa').insert({
    usuario_id: user2, empresa_id: empresaA, rol: 'empleado',
  });
  if (mErr) throw mErr;

  // ---- Empresa B: owner (user3), tenant separado ----
  user3 = await nuevoUsuario(EMAIL3);
  const sbB = clienteLogueado();
  const sB = await login(sbB, EMAIL3);
  const { data: eidB, error: oeB } = await sbB.rpc('crear_empresa_y_membresia', {
    p_rut: RUT_B, p_razon_social: 'Negocio B', p_usa_iva: true,
  });
  if (oeB) throw oeB;
  empresaB = eidB;
  await sbB.auth.refreshSession({ refresh_token: sB.session?.refresh_token ?? sB.refresh_token });

  // ---- productos en A y B (sin control de stock para simplificar) ----
  const prodA = { empresa_id: empresaA, sku: 'CAFE', nombre: 'Café', precio_total: 2000, precio_neto: 1681, tasa_iva: 19, controla_stock: false };
  const { data: pA, error: peA } = await sbA.from('productos').insert(prodA).select('id').single();
  if (peA) throw peA;
  const idCafeA = pA.id;
  const prodB = { empresa_id: empresaB, sku: 'CAFE', nombre: 'Café', precio_total: 2000, precio_neto: 1681, tasa_iva: 19, controla_stock: false };
  const { data: pB, error: peB } = await sbB.from('productos').insert(prodB).select('id').single();
  if (peB) throw peB;
  const idCafeB = pB.id;

  const { data: mpsA } = await sbA.from('metodos_pago').select('id, tipo');
  const efectivoA = mpsA.find((m) => m.tipo === 'cash').id;
  const { data: mpsB } = await sbB.from('metodos_pago').select('id, tipo');
  const efectivoB = mpsB.find((m) => m.tipo === 'cash').id;

  // ---- ventas empresa A ----
  // user1 (owner): 2 ventas → 2× Café (4000) + 1× Café (2000) = 6000 total, 3 ventas? no: 2 ventas
  //   v1: 2×Café = 4000 ; v2: 1×Café = 2000  → user1 total 6000, num 2, ticket 3000
  // user2 (empleado): 1 venta → 3×Café = 6000? hagamos 1×Café = 2000 para que user1 quede primero
  //   v3: 1×Café = 2000 → user2 total 2000, num 1
  const vender = (sb, idProd, metodo, cant, monto, usuario) => sb.rpc('process_sale', {
    p_venta_id: randomUUID(),
    p_lineas: [{ producto_id: idProd, cantidad: cant }],
    p_pagos: [{ metodo_pago_id: metodo, monto }],
    p_usuario_id: usuario,
  });

  let r;
  r = await vender(sbA, idCafeA, efectivoA, 2, 4000, user1); if (r.error) throw r.error;
  r = await vender(sbA, idCafeA, efectivoA, 1, 2000, user1); if (r.error) throw r.error;
  r = await vender(sbA, idCafeA, efectivoA, 1, 2000, user2); if (r.error) throw r.error;
  // venta en empresa B (no debe aparecer en reporte de A)
  r = await vender(sbB, idCafeB, efectivoB, 1, 2000, user3); if (r.error) throw r.error;

  const desde = new Date(Date.now() - 2 * 3600_000).toISOString();
  const hasta = new Date(Date.now() + 2 * 3600_000).toISOString();

  // ---- RPC reporte_ventas_por_cajero desde empresa A ----
  const { data: rep, error: re } = await sbA.rpc('reporte_ventas_por_cajero', { p_desde: desde, p_hasta: hasta });
  if (re) throw re;

  check('reporte tiene 2 cajeros', rep.length === 2, `got ${rep.length}: ${JSON.stringify(rep)}`);
  const row1 = rep.find((x) => x.usuario_id === user1);
  const row2 = rep.find((x) => x.usuario_id === user2);
  check('user1 presente', !!row1, JSON.stringify(rep));
  check('user2 presente', !!row2, JSON.stringify(rep));
  check('user1 num_ventas == 2', row1 && Number(row1.num_ventas) === 2, JSON.stringify(row1));
  check('user1 total == 6000', row1 && approx(row1.total, 6000), JSON.stringify(row1));
  check('user1 ticket == 3000', row1 && approx(row1.ticket_promedio, 3000), JSON.stringify(row1));
  check('user2 num_ventas == 1', row2 && Number(row2.num_ventas) === 1, JSON.stringify(row2));
  check('user2 total == 2000', row2 && approx(row2.total, 2000), JSON.stringify(row2));
  check('cajero1 muestra email', row1 && row1.cajero === EMAIL1, row1 ? row1.cajero : '—');
  check('cajero2 muestra email', row2 && row2.cajero === EMAIL2, row2 ? row2.cajero : '—');
  check('orden por total desc (user1 primero)', rep[0]?.usuario_id === user1, rep.map((x) => x.cajero).join(','));
  check('cajero de B (user3) NO aparece', !rep.some((x) => x.usuario_id === user3), JSON.stringify(rep));

  // ---- aislamiento: reporte desde B no ve ventas de A ----
  const { data: repB, error: reB } = await sbB.rpc('reporte_ventas_por_cajero', { p_desde: desde, p_hasta: hasta });
  if (reB) throw reB;
  check('reporte de B solo tiene 1 cajero (user3)', repB.length === 1 && repB[0]?.usuario_id === user3, JSON.stringify(repB));

  // ---- anon no ejecuta ----
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: anonErr } = await anonClient.rpc('reporte_ventas_por_cajero', { p_desde: desde, p_hasta: hasta });
  check('anon NO puede ejecutar RPC', !!anonErr, anonErr ? anonErr.code : 'sin error (MAL)');
} catch (e) {
  console.error('\n💥 Error en el flujo:', e.message || e);
  ok = false;
} finally {
  if (empresaA) await admin.from('empresas').delete().eq('id', empresaA);
  if (empresaB) await admin.from('empresas').delete().eq('id', empresaB);
  if (user1) await admin.auth.admin.deleteUser(user1);
  if (user2) await admin.auth.admin.deleteUser(user2);
  if (user3) await admin.auth.admin.deleteUser(user3);
}

console.log('\n=== Resultados verificación reporte por cajero ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
