// Verificación e2e de los RPCs de reportes (Fase 5).
// Crea empresa+usuario de prueba, registra 2 ventas con montos conocidos,
// llama a los 5 RPCs y compara contra los valores esperados. LIMPIA todo al final.
//
// Uso: node scripts/verify-reportes.mjs   (lee .env.local)
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

// RUT válido (Módulo 11) para la empresa de prueba.
const RUT = '76192083-9';
const EMAIL = `test-reportes-${Date.now()}@example.com`;
const PASS = 'Test1234!';

let userId, empresaId, ok = true;
const results = [];
const approx = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol;
function check(name, cond, extra = '') {
  results.push({ name, pass: !!cond, extra });
  if (!cond) ok = false;
}

try {
  // 1. crear usuario confirmado
  const { data: u, error: ue } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASS, email_confirm: true,
  });
  if (ue) throw ue;
  userId = u.user.id;

  // 2. login (cliente anon)
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1, error: se } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (se) throw se;

  // 3. onboarding (aún sin empresa_id en el JWT)
  const { data: eid, error: oe } = await sb.rpc('crear_empresa_y_membresia', {
    p_rut: RUT, p_razon_social: 'Cafetería Test Reportes', p_usa_iva: true,
  });
  if (oe) throw oe;
  empresaId = eid;

  // 4. refresh → el Auth Hook ahora inyecta empresa_id + user_rol
  const { error: re } = await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });
  if (re) throw re;

  // 5. crear 2 productos (escritura admin via RLS)
  const cafe = { empresa_id: empresaId, sku: 'CAFE', nombre: 'Café', precio_total: 2000, precio_neto: 1681, tasa_iva: 19, controla_stock: false };
  const te   = { empresa_id: empresaId, sku: 'TE',   nombre: 'Té',   precio_total: 1500, precio_neto: 1261, tasa_iva: 19, controla_stock: false };
  const { data: prods, error: pe } = await sb.from('productos').insert([cafe, te]).select('id, sku');
  if (pe) throw pe;
  const idCafe = prods.find((p) => p.sku === 'CAFE').id;
  const idTe = prods.find((p) => p.sku === 'TE').id;

  // métodos de pago sembrados por onboarding
  const { data: mps } = await sb.from('metodos_pago').select('id, tipo');
  const efectivo = mps.find((m) => m.tipo === 'cash').id;
  const debito = mps.find((m) => m.tipo === 'card').id;

  // 6. dos ventas con montos conocidos
  //   venta1: 2× Café (4000) + 1× Té (1500) = 5500, efectivo
  //   venta2: 1× Café (2000), débito
  const v1 = await sb.rpc('process_sale', {
    p_venta_id: randomUUID(),
    p_lineas: [{ producto_id: idCafe, cantidad: 2 }, { producto_id: idTe, cantidad: 1 }],
    p_pagos: [{ metodo_pago_id: efectivo, monto: 5500 }],
    p_usuario_id: userId,
  });
  if (v1.error) throw v1.error;
  const v2 = await sb.rpc('process_sale', {
    p_venta_id: randomUUID(),
    p_lineas: [{ producto_id: idCafe, cantidad: 1 }],
    p_pagos: [{ metodo_pago_id: debito, monto: 2000 }],
    p_usuario_id: userId,
  });
  if (v2.error) throw v2.error;

  // ventana temporal que cubre "ahora"
  const desde = new Date(Date.now() - 2 * 3600_000).toISOString();
  const hasta = new Date(Date.now() + 2 * 3600_000).toISOString();
  const anio = new Date().getFullYear();

  // 7. RPC reporte_ventas_resumen
  const { data: resumen, error: r1 } = await sb.rpc('reporte_ventas_resumen', { p_desde: desde, p_hasta: hasta });
  if (r1) throw r1;
  const R = resumen[0];
  check('resumen.num_ventas == 2', Number(R.num_ventas) === 2, JSON.stringify(R));
  check('resumen.total == 7500', approx(R.total, 7500), `got ${R.total}`);
  check('resumen.neto+iva == total', approx(Number(R.neto) + Number(R.iva), R.total), `${R.neto}+${R.iva}`);
  check('resumen.ticket_promedio == 3750', approx(R.ticket_promedio, 3750), `got ${R.ticket_promedio}`);

  // 8. reporte_top_productos
  const { data: top, error: r2 } = await sb.rpc('reporte_top_productos', { p_desde: desde, p_hasta: hasta, p_limite: 5 });
  if (r2) throw r2;
  const cafeRow = top.find((t) => t.producto_id === idCafe);
  const teRow = top.find((t) => t.producto_id === idTe);
  check('top.Café cantidad == 3', cafeRow && approx(cafeRow.cantidad, 3), JSON.stringify(cafeRow));
  check('top.Café total == 6000', cafeRow && approx(cafeRow.total, 6000), JSON.stringify(cafeRow));
  check('top.Té total == 1500', teRow && approx(teRow.total, 1500), JSON.stringify(teRow));
  check('top ordenado (Café primero)', top[0]?.producto_id === idCafe, top.map((t) => t.nombre).join(','));

  // 9. reporte_ventas_por_metodo
  const { data: met, error: r3 } = await sb.rpc('reporte_ventas_por_metodo', { p_desde: desde, p_hasta: hasta });
  if (r3) throw r3;
  const efRow = met.find((m) => m.metodo_pago_id === efectivo);
  const dbRow = met.find((m) => m.metodo_pago_id === debito);
  check('metodo.Efectivo total == 5500', efRow && approx(efRow.total, 5500), JSON.stringify(efRow));
  check('metodo.Débito total == 2000', dbRow && approx(dbRow.total, 2000), JSON.stringify(dbRow));

  // 10. reporte_ventas_por_dia
  const { data: dia, error: r4 } = await sb.rpc('reporte_ventas_por_dia', { p_desde: desde, p_hasta: hasta });
  if (r4) throw r4;
  const totalDias = dia.reduce((s, d) => s + Number(d.total), 0);
  const ventasDias = dia.reduce((s, d) => s + Number(d.num_ventas), 0);
  check('por_dia suma total == 7500', approx(totalDias, 7500), `got ${totalDias}`);
  check('por_dia suma num_ventas == 2', ventasDias === 2, `got ${ventasDias}`);

  // 11. reporte_iva_mensual
  const { data: iva, error: r5 } = await sb.rpc('reporte_iva_mensual', { p_anio: anio });
  if (r5) throw r5;
  const ivaTotal = iva.reduce((s, m) => s + Number(m.iva_debito), 0);
  const ventasIva = iva.reduce((s, m) => s + Number(m.num_ventas), 0);
  check('iva_mensual num_ventas >= 2', ventasIva >= 2, `got ${ventasIva}`);
  check('iva_mensual iva_debito ~ 1197', approx(ivaTotal, Number(R.iva), 2), `got ${ivaTotal} vs ${R.iva}`);

  // 12. aislamiento: con anon (sin login) no debe ejecutar
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: anonErr } = await anonClient.rpc('reporte_ventas_resumen', { p_desde: desde, p_hasta: hasta });
  check('anon NO puede ejecutar RPC', !!anonErr, anonErr ? anonErr.code : 'sin error (MAL)');
} catch (e) {
  console.error('\n💥 Error en el flujo:', e.message || e);
  ok = false;
} finally {
  // limpieza total
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Resultados verificación reportes ===');
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.pass ? '' : '  → ' + r.extra}`);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
