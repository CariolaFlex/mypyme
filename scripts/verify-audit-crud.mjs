// Verificación e2e de la auditoría UX/UI (Bloques B / B2b / C).
// Token real de un tenant de prueba (RLS aplica). Crea empresa y LIMPIA al final.
// Cubre: editar/eliminar productos, proveedores (+contacto), categorías (SET NULL),
// categorías de gasto, métodos de pago; borrado bloqueado por historial (FK RESTRICT);
// tipo_documento en gastos/facturas; F29 crédito cuenta SOLO facturas.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-audit-${Date.now()}@example.com`, PASS = 'Test1234!';
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
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '77815460-9', p_razon_social: 'Audit CRUD Test', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  // ── B1 Productos: crear / editar / eliminar limpio ──────────────────────
  const { data: p1, error: pe1 } = await sb.from('productos')
    .insert({ empresa_id: empresaId, sku: 'AUD-1', nombre: 'Producto Uno', precio_total: 1190, precio_neto: 1000, tasa_iva: 19 })
    .select('id').single();
  check('producto: crear', !pe1 && !!p1?.id, pe1?.message);

  const { error: pu } = await sb.from('productos').update({ nombre: 'Producto Editado', precio_total: 2380, precio_neto: 2000 }).eq('id', p1.id);
  const { data: p1r } = await sb.from('productos').select('nombre, precio_total').eq('id', p1.id).single();
  check('producto: editar (RLS update)', !pu && p1r?.nombre === 'Producto Editado' && approx(p1r.precio_total, 2380), pu?.message);

  const { error: pd } = await sb.from('productos').delete().eq('id', p1.id);
  const { data: p1g } = await sb.from('productos').select('id').eq('id', p1.id);
  check('producto: eliminar limpio (sin historial)', !pd && (p1g?.length ?? 0) === 0, pd?.message);

  // ── B3 Categorías: rename + ON DELETE SET NULL ──────────────────────────
  const { data: cat } = await sb.from('categorias_producto').insert({ empresa_id: empresaId, nombre: 'Cat Vieja' }).select('id').single();
  const { error: ce } = await sb.from('categorias_producto').update({ nombre: 'Cat Nueva' }).eq('id', cat.id);
  const { data: catr } = await sb.from('categorias_producto').select('nombre').eq('id', cat.id).single();
  check('categoría: renombrar', !ce && catr?.nombre === 'Cat Nueva', ce?.message);

  const { data: p2 } = await sb.from('productos')
    .insert({ empresa_id: empresaId, sku: 'AUD-2', nombre: 'Con Categoría', precio_total: 1000, precio_neto: 1000, tasa_iva: 0, categoria_id: cat.id })
    .select('id').single();
  await sb.from('categorias_producto').delete().eq('id', cat.id);
  const { data: p2r } = await sb.from('productos').select('categoria_id').eq('id', p2.id).single();
  check('categoría: eliminar → productos quedan sin categoría (SET NULL)', p2r?.categoria_id === null, JSON.stringify(p2r));

  // ── B2/B2b Proveedores: crear con contacto / editar / eliminar bloqueado ─
  const { data: prov, error: pve } = await sb.from('proveedores')
    .insert({ empresa_id: empresaId, nombre: 'Distribuidora Sur', rut: '77777777-7', email: 'mal@tipeo.cl', contacto_nombre: 'Juan Vendedor', contacto_telefono: '+56 9 1111 1111', contacto_email: 'juan@dist.cl' })
    .select('id, contacto_nombre').single();
  check('proveedor: crear con contacto/vendedor (B2b)', !pve && prov?.contacto_nombre === 'Juan Vendedor', pve?.message);

  const { error: pvu } = await sb.from('proveedores').update({ email: 'bien@corregido.cl' }).eq('id', prov.id);
  const { data: provr } = await sb.from('proveedores').select('email').eq('id', prov.id).single();
  check('proveedor: editar (corregir email)', !pvu && provr?.email === 'bien@corregido.cl', pvu?.message);

  // ── B5 Categorías de gasto: crear / editar / eliminar + bloqueo por gasto ─
  const { data: cg, error: cge } = await sb.from('categorias_gasto').insert({ empresa_id: empresaId, nombre: 'Marketing' }).select('id').single();
  check('categoría de gasto: crear (cierra el gap reportado)', !cge && !!cg?.id, cge?.message);
  const { error: cgu } = await sb.from('categorias_gasto').update({ nombre: 'Publicidad' }).eq('id', cg.id);
  check('categoría de gasto: editar', !cgu, cgu?.message);

  // ── C Gastos con tipo_documento + F29 crédito SOLO facturas ─────────────
  // Gasto FACTURA: total 11900 @19% → IVA 1900 (debe sumar al crédito)
  const { data: gFac } = await sb.rpc('registrar_gasto', { p_categoria_gasto_id: cg.id, p_descripcion: 'Gasto factura', p_monto_total: 11900, p_tasa_iva: 19 });
  // Gasto BOLETA: total 11900 @19% → IVA 1900 pero tipo boleta (NO debe sumar al crédito)
  const { data: gBol } = await sb.rpc('registrar_gasto', { p_categoria_gasto_id: cg.id, p_descripcion: 'Gasto boleta', p_monto_total: 11900, p_tasa_iva: 19 });
  await sb.from('gastos').update({ tipo_documento: 'boleta' }).eq('id', gBol);

  const { data: gf } = await sb.from('gastos').select('tipo_documento').eq('id', gFac).single();
  check('gasto: tipo_documento por defecto = factura', gf?.tipo_documento === 'factura', JSON.stringify(gf));

  const anio = new Date().getFullYear();
  const { data: cred } = await sb.rpc('reporte_iva_credito_mensual', { p_anio: anio });
  const totCred = (cred ?? []).reduce((s, f) => s + Number(f.iva_credito), 0);
  check('F29: crédito cuenta SOLO la factura (1900, no 3800)', approx(totCred, 1900, 2), `total crédito=${totCred}`);

  // eliminar gasto sin caja (permitido)
  const { error: gd } = await sb.from('gastos').delete().eq('id', gBol);
  check('gasto: eliminar (sin caja) permitido', !gd, gd?.message);

  // categoría de gasto con gasto asociado → eliminar BLOQUEADO (FK RESTRICT)
  const { error: cgd } = await sb.from('categorias_gasto').delete().eq('id', cg.id);
  check('categoría de gasto: eliminar BLOQUEADO si tiene gastos (FK 23503)', cgd?.code === '23503', cgd ? cgd.code : 'borró sin bloquear');

  // proveedor con gasto asociado → eliminar BLOQUEADO
  await sb.rpc('registrar_gasto', { p_categoria_gasto_id: cg.id, p_descripcion: 'Gasto con proveedor', p_monto_total: 1000, p_tasa_iva: 0, p_proveedor_id: prov.id });
  const { error: pvd } = await sb.from('proveedores').delete().eq('id', prov.id);
  check('proveedor: eliminar BLOQUEADO si tiene gastos (FK 23503)', pvd?.code === '23503', pvd ? pvd.code : 'borró sin bloquear');

  // ── B6 Métodos de pago: editar / eliminar limpio ────────────────────────
  const { data: met } = await sb.from('metodos_pago').insert({ empresa_id: empresaId, nombre: 'Mercado Pago', tipo: 'other' }).select('id').single();
  const { error: meu } = await sb.from('metodos_pago').update({ nombre: 'MercadoPago QR' }).eq('id', met.id);
  check('método de pago: editar', !meu, meu?.message);
  const { error: med } = await sb.from('metodos_pago').delete().eq('id', met.id);
  check('método de pago: eliminar limpio', !med, med?.message);

  // ── C Facturas de proveedor: columna tipo_documento ─────────────────────
  const { data: fac } = await sb.rpc('crear_factura_proveedor', { p_proveedor_id: prov.id, p_numero_factura: 'F-1', p_monto_total: 11900, p_tasa_iva: 19 });
  await sb.from('facturas_proveedor').update({ tipo_documento: 'boleta' }).eq('id', fac);
  const { data: facr } = await sb.from('facturas_proveedor').select('tipo_documento').eq('id', fac).single();
  check('factura proveedor: tipo_documento se guarda', facr?.tipo_documento === 'boleta', JSON.stringify(facr));
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación Auditoría UX/UI (CRUD B/B2b/C) ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
