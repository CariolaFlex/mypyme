// Siembra la empresa DEMO "Vivero Demo" para mostrar Gestionala a un cliente de
// vivero, jardinería y cerámica (Huerto y Jardín). Persiste; se borra con
// `node scripts/teardown-demo-vivero.mjs`.
//
// Credenciales y estado: se escriben en `.env.demo.local` (gitignoreado por `.env*`).
// No se imprimen en la consola.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';

const parse = (path) => Object.fromEntries(
  readFileSync(new URL(path, import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const env = parse('../.env.local');
const DEMO_FILE = new URL('../.env.demo.local', import.meta.url);
if (existsSync(DEMO_FILE) && parse('../.env.demo.local').DEMO_VIVERO_EMPRESA_ID) {
  console.error('Ya existe una demo vivero. Bórrala primero: node scripts/teardown-demo-vivero.mjs');
  process.exit(1);
}

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const EMAIL = 'demo-vivero@vectium.cl';
const PASS = 'Vivero-' + randomBytes(6).toString('base64url');

const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
if (ue) throw ue;
const userId = u.user.id;

// Guardar credenciales apenas existe el usuario, para poder borrarlo aunque algo falle después.
const save = (extra = {}) => writeFileSync(DEMO_FILE, [
  '# Cuenta demo de Gestionala para la reunión con Huerto y Jardín. Borrar con scripts/teardown-demo-vivero.mjs',
  `DEMO_VIVERO_EMAIL=${EMAIL}`, `DEMO_VIVERO_PASSWORD=${PASS}`, `DEMO_VIVERO_USER_ID=${userId}`,
  ...Object.entries(extra).map(([k, v]) => `${k}=${v}`), '',
].join('\n'));
save();

const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: s1, error: le } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (le) throw le;
// RUT de prueba válido y único (el RUT de empresa es UNIQUE en la base).
const rutDemo = (() => {
  const base = 77000000 + Math.floor(Math.random() * 900000);
  let s = 0, m = 2;
  for (const d of String(base).split('').reverse()) { s += Number(d) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return `${base}-${r === 11 ? '0' : r === 10 ? 'K' : r}`;
})();
const { data: empresaId, error: ee } = await sb.rpc('crear_empresa_y_membresia', {
  p_rut: rutDemo, p_razon_social: 'Vivero Demo', p_usa_iva: true,
});
if (ee) throw ee;
await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });
save({ DEMO_VIVERO_EMPRESA_ID: empresaId });

// Acceso de cortesía 60 días (no depende del trial ni de Flow).
const hasta = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
await admin.from('empresas').update({ acceso_cortesia_hasta: hasta }).eq('id', empresaId);
await admin.from('configuracion_negocio').update({ tipo_negocio: 'otro', umbral_stock_bajo: 3 }).eq('empresa_id', empresaId);

const must = (r, what) => { if (r.error) throw new Error(what + ': ' + r.error.message); return r.data; };

// Categorías
const CATS = ['Plantas de interior', 'Plantas de exterior', 'Suculentas y cactus', 'Tierra y abono',
  'Maceteros y cerámica', 'Figuras de jardín', 'Hornos y quinchos', 'Servicios de jardinería'];
const cats = must(await sb.from('categorias_producto').insert(CATS.map((nombre) => ({ empresa_id: empresaId, nombre }))).select('id, nombre'), 'categorías');
const cat = (n) => cats.find((c) => c.nombre === n).id;

// Productos (precio con IVA; neto calculado)
const P = (sku, nombre, c, total, extra = {}) => ({
  empresa_id: empresaId, sku, nombre, categoria_id: cat(c), precio_total: total,
  precio_neto: Math.round(total / 1.19), tasa_iva: 19, controla_stock: true, stock_minimo: 3,
  unidad_medida: 'unidad', granel: false, ...extra,
});
const productos = [
  P('MONS-M', 'Monstera deliciosa (maceta 20 cm)', 'Plantas de interior', 18990),
  P('POTUS', 'Potus colgante', 'Plantas de interior', 7990),
  P('SANSE', 'Sansevieria', 'Plantas de interior', 9990),
  P('FICUS', 'Ficus lyrata', 'Plantas de interior', 24990),
  P('LAVAN', 'Lavanda', 'Plantas de exterior', 4990),
  P('ROSAL', 'Rosal trepador', 'Plantas de exterior', 8990),
  P('LIMON', 'Limonero injertado', 'Plantas de exterior', 29990),
  P('OLIVO', 'Olivo ornamental', 'Plantas de exterior', 39990),
  P('AGAVE', 'Agave', 'Suculentas y cactus', 6990),
  P('ECHEV', 'Echeveria (maceta 10 cm)', 'Suculentas y cactus', 2990),
  P('CACTU', 'Cactus columnar', 'Suculentas y cactus', 12990),
  P('TIERR-50', 'Tierra de hoja (saco 50 L)', 'Tierra y abono', 5990),
  P('HUMUS-25', 'Humus de lombriz (saco 25 L)', 'Tierra y abono', 7990),
  P('ABONO-KG', 'Abono orgánico a granel', 'Tierra y abono', 2490, { unidad_medida: 'kg', granel: true }),
  P('MAC-TERR', 'Macetero de greda 30 cm', 'Maceteros y cerámica', 9990),
  P('MAC-ESM', 'Macetero esmaltado azul', 'Maceteros y cerámica', 16990),
  P('JARRON', 'Jarrón de cerámica artesanal', 'Maceteros y cerámica', 22990),
  P('FIG-RANA', 'Figura de rana en greda', 'Figuras de jardín', 8990),
  P('FIG-BUDA', 'Buda de jardín', 'Figuras de jardín', 34990),
  P('HORNO-M', 'Horno de barro mediano (a pedido)', 'Hornos y quinchos', 590000, { controla_stock: false, stock_minimo: null }),
  P('QUINCHO', 'Quincho de madera 3x3 (a pedido)', 'Hornos y quinchos', 1890000, { controla_stock: false, stock_minimo: null }),
  P('SRV-MANT', 'Mantención de jardín (visita)', 'Servicios de jardinería', 35000, { controla_stock: false, stock_minimo: null }),
  P('SRV-PODA', 'Poda de árboles (por hora)', 'Servicios de jardinería', 18000, { controla_stock: false, stock_minimo: null }),
  P('SRV-PASTO', 'Instalación de pasto (por m²)', 'Servicios de jardinería', 6500, { controla_stock: false, stock_minimo: null, unidad_medida: 'm2' }),
];
const prods = must(await sb.from('productos').insert(productos).select('id, sku, precio_total, controla_stock'), 'productos');
const pid = (sku) => prods.find((p) => p.sku === sku).id;

// Stock inicial en la bodega por defecto (dos productos quedan bajo el mínimo)
const bodega = must(await sb.from('bodegas').select('id').eq('es_default', true).single(), 'bodega');
const stock = { 'MONS-M': 8, POTUS: 15, SANSE: 10, FICUS: 2, LAVAN: 30, ROSAL: 12, LIMON: 6, OLIVO: 4, AGAVE: 9, ECHEV: 40,
  CACTU: 7, 'TIERR-50': 25, 'HUMUS-25': 18, 'ABONO-KG': 200, 'MAC-TERR': 20, 'MAC-ESM': 2, JARRON: 5, 'FIG-RANA': 11, 'FIG-BUDA': 3 };
for (const [sku, n] of Object.entries(stock)) {
  must(await sb.rpc('registrar_movimiento', { p_producto_id: pid(sku), p_bodega_id: bodega.id, p_cantidad: n, p_tipo: 'compra', p_nota: 'Stock inicial demo' }), 'stock ' + sku);
}
must(await sb.rpc('registrar_movimiento', { p_producto_id: pid('LAVAN'), p_bodega_id: bodega.id, p_cantidad: -3, p_tipo: 'merma', p_nota: 'Plantas secas por calor' }), 'merma');

// Proveedores
const provs = must(await sb.from('proveedores').insert([
  { empresa_id: empresaId, nombre: 'Vivero Mayorista del Valle', rut: '76111111-1', telefono: '+56 9 1111 1111' },
  { empresa_id: empresaId, nombre: 'Cerámica Artesanal Elqui', rut: '76222222-2', telefono: '+56 9 2222 2222' },
  { empresa_id: empresaId, nombre: 'Sustratos del Norte', rut: '76333333-3', telefono: '+56 9 3333 3333' },
]).select('id, nombre'), 'proveedores');

// Caja abierta con ventas variadas (se reparten en los últimos 14 días)
const mps = must(await sb.from('metodos_pago').select('id, tipo'), 'métodos');
const efectivo = mps.find((m) => m.tipo === 'cash').id;
const tarjeta = mps.find((m) => m.tipo === 'card').id;
const transfer = (mps.find((m) => m.tipo === 'transfer') || mps.find((m) => m.tipo !== 'cash' && m.tipo !== 'card') || { id: tarjeta }).id;
const sesionId = must(await sb.rpc('abrir_caja', { p_monto_apertura: 50000 }), 'abrir caja');

const precio = (sku) => Number(prods.find((p) => p.sku === sku).precio_total);
const ventas = [
  [['MONS-M', 1], ['MAC-TERR', 1]], [['LAVAN', 4]], [['ECHEV', 6], ['CACTU', 1]], [['TIERR-50', 2], ['HUMUS-25', 1]],
  [['SRV-MANT', 1]], [['ROSAL', 2], ['ABONO-KG', 3]], [['FIG-RANA', 2]], [['LIMON', 1], ['TIERR-50', 1]],
  [['JARRON', 1]], [['POTUS', 2], ['SANSE', 1]], [['SRV-PODA', 3]], [['OLIVO', 1], ['MAC-ESM', 1]],
  [['AGAVE', 2], ['ECHEV', 4]], [['SRV-PASTO', 40]], [['FIG-BUDA', 1]], [['MONS-M', 1], ['POTUS', 1], ['HUMUS-25', 1]],
  [['LAVAN', 6], ['ROSAL', 1]], [['SRV-MANT', 1]], [['CACTU', 2]], [['TIERR-50', 3], ['ABONO-KG', 5]],
];
const ventaIds = [];
for (const [i, lineas] of ventas.entries()) {
  const total = lineas.reduce((s, [sku, n]) => s + precio(sku) * n, 0);
  const pago = [efectivo, tarjeta, tarjeta, transfer][i % 4];
  const id = randomUUID();
  must(await sb.rpc('process_sale', {
    p_venta_id: id,
    p_lineas: lineas.map(([sku, cantidad]) => ({ producto_id: pid(sku), cantidad })),
    p_pagos: [{ metodo_pago_id: pago, monto: total, monto_recibido: total }],
    p_usuario_id: userId, p_sesion_caja_id: sesionId,
  }), 'venta ' + i);
  ventaIds.push(id);
}
// Repartir las fechas de las ventas en los últimos 14 días (dejar 4 hoy)
for (const [i, id] of ventaIds.entries()) {
  if (i >= ventaIds.length - 4) continue;
  const dias = 14 - Math.floor(i * 14 / (ventaIds.length - 4));
  const fecha = new Date(Date.now() - dias * 864e5 + (i % 5) * 3600e3).toISOString();
  await admin.from('ventas').update({ fecha_venta: fecha, creado_en: fecha }).eq('id', id);
}

// Gastos
const catsGasto = must(await sb.from('categorias_gasto').select('id, nombre'), 'categorías de gasto');
const cg = (i) => catsGasto[i % catsGasto.length].id;
const gastos = [
  { d: 'Compra de plantas al mayorista', m: 380000, iva: 19, prov: 0 },
  { d: 'Maceteros y figuras de greda', m: 145000, iva: 19, prov: 1 },
  { d: 'Sacos de tierra y humus', m: 96000, iva: 19, prov: 2 },
  { d: 'Combustible camioneta', m: 60000, iva: 19 },
  { d: 'Arriendo del local', m: 450000, iva: 0 },
];
for (const [i, g] of gastos.entries()) {
  must(await sb.rpc('registrar_gasto', {
    p_categoria_gasto_id: cg(i), p_descripcion: g.d, p_monto_total: g.m, p_tasa_iva: g.iva,
    p_proveedor_id: g.prov != null ? provs[g.prov].id : null,
  }), 'gasto ' + i);
}

// Cuentas por cobrar: anticipo de un quincho y un fiado
must(await sb.from('deudas').insert([
  { empresa_id: empresaId, tipo: 'por_cobrar', categoria: 'cliente', contraparte: 'Cliente quincho (ejemplo)', descripcion: 'Saldo del quincho 3x3 tras anticipo del 50%', monto_total: 945000, saldo: 945000 },
  { empresa_id: empresaId, tipo: 'por_cobrar', categoria: 'cliente', contraparte: 'Condominio (ejemplo)', descripcion: 'Mantención mensual de áreas verdes', monto_total: 120000, saldo: 60000 },
]), 'deudas');

console.log('Demo vivero creada. Credenciales en .env.demo.local (gitignoreado).');
console.log(`Productos: ${prods.length} · Ventas: ${ventaIds.length} · Gastos: ${gastos.length}`);
