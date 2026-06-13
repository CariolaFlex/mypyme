// Siembra una cuenta DEMO con ventas y emite las cookies de sesión SSR
// (mismas que pondría el login de la app), para verificar la UI en el navegador
// sin tipear contraseñas. Persiste los datos; el teardown los borra después.
//
// Imprime en stdout un JSON: { email, cookies: [{name, value}], state }.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const EMAIL = `demo-reportes-${Date.now()}@example.com`;
const PASS = randomUUID(); // password descartable, nunca se tipea

const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
if (ue) throw ue;
const userId = u.user.id;

// login + onboarding + datos, con cliente anon normal
const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
const { data: empresaId } = await sb.rpc('crear_empresa_y_membresia', {
  p_rut: '76192083-9', p_razon_social: 'Cafetería Demo (reportes)', p_usa_iva: true,
});
await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

const { data: prods } = await sb.from('productos').insert([
  { empresa_id: empresaId, sku: 'CAPP', nombre: 'Cappuccino', precio_total: 2500, precio_neto: 2101, tasa_iva: 19, controla_stock: false },
  { empresa_id: empresaId, sku: 'CROIS', nombre: 'Croissant', precio_total: 1800, precio_neto: 1513, tasa_iva: 19, controla_stock: false },
  { empresa_id: empresaId, sku: 'JUGO', nombre: 'Jugo natural', precio_total: 2200, precio_neto: 1849, tasa_iva: 19, controla_stock: false },
]).select('id, sku');
const id = (sku) => prods.find((p) => p.sku === sku).id;
const { data: mps } = await sb.from('metodos_pago').select('id, tipo');
const efectivo = mps.find((m) => m.tipo === 'cash').id;
const debito = mps.find((m) => m.tipo === 'card').id;

// 4 ventas variadas
const ventas = [
  { lineas: [{ producto_id: id('CAPP'), cantidad: 2 }, { producto_id: id('CROIS'), cantidad: 1 }], pago: efectivo, monto: 6800 },
  { lineas: [{ producto_id: id('CAPP'), cantidad: 1 }], pago: debito, monto: 2500 },
  { lineas: [{ producto_id: id('JUGO'), cantidad: 3 }], pago: efectivo, monto: 6600 },
  { lineas: [{ producto_id: id('CROIS'), cantidad: 2 }, { producto_id: id('JUGO'), cantidad: 1 }], pago: debito, monto: 5800 },
];
for (const v of ventas) {
  const r = await sb.rpc('process_sale', {
    p_venta_id: randomUUID(), p_lineas: v.lineas,
    p_pagos: [{ metodo_pago_id: v.pago, monto: v.monto }], p_usuario_id: userId,
  });
  if (r.error) throw r.error;
}

// gastos (crédito fiscal para el F29)
const { data: catsG } = await sb.from('categorias_gasto').select('id, nombre');
const catG = (n) => catsG.find((c) => c.nombre === n).id;
for (const g of [
  { cat: 'Insumos', desc: 'Compra de café en grano', total: 11900, iva: 19 },
  { cat: 'Servicios básicos', desc: 'Cuenta de luz', total: 35700, iva: 19 },
]) {
  const r = await sb.rpc('registrar_gasto', {
    p_categoria_gasto_id: catG(g.cat), p_descripcion: g.desc, p_monto_total: g.total, p_tasa_iva: g.iva,
  });
  if (r.error) throw r.error;
}

// Emitir cookies SSR usando la MISMA librería que la app
let captured = [];
const ssr = createServerClient(URL_, ANON, {
  cookies: { getAll: () => [], setAll: (cks) => { captured = cks; } },
});
const { error: le } = await ssr.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (le) throw le;

writeFileSync(new URL('./.demo-state.json', import.meta.url),
  JSON.stringify({ userId, empresaId, email: EMAIL }, null, 2));

console.log(JSON.stringify({
  email: EMAIL,
  cookies: captured.map(({ name, value }) => ({ name, value })),
}));
