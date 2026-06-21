// Verificación e2e del flujo OCR factura (tabla ocr_scans + registro de factura).
// Token real de un tenant de prueba (RLS aplica). Crea empresa y LIMPIA al final.
// Cubre: insertar/editar scan, estados (borrador→revisado→importado), CHECK de estado,
// resolver proveedor + crear_factura_proveedor + link factura_id en el scan.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL = `test-ocr-${Date.now()}@example.com`, PASS = 'Test1234!';
let userId, empresaId, ok = true;
const results = [];
const check = (n, c, e = '') => { results.push({ n, c: !!c, e }); if (!c) ok = false; };

try {
  const { data: u, error: ue } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
  if (ue) throw ue;
  userId = u.user.id;
  const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  const { data: eid } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '77815460-9', p_razon_social: 'OCR Test', p_usa_iva: true });
  empresaId = eid;
  await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

  const datos = {
    rut: '76192083-9', razonSocial: 'Distribuidora OCR SpA', folio: '12345',
    fecha: '2026-06-21', neto: 10000, iva: 1900, total: 11900,
    items: [{ descripcion: 'Caja de bebidas', cantidad: 2, precio: 5000, total: 10000 }],
  };

  // ── Insertar scan (borrador) bajo RLS ───────────────────────────────────
  const { data: scan, error: se } = await sb.from('ocr_scans')
    .insert({ empresa_id: empresaId, datos, texto_plano: 'FACTURA...', confianza: 0.82, estado: 'borrador' })
    .select('id, estado').single();
  check('scan: crear borrador (RLS)', !se && scan?.estado === 'borrador', se?.message);

  // ── Estado inválido bloqueado por CHECK ─────────────────────────────────
  const { error: badEstado } = await sb.from('ocr_scans').update({ estado: 'cualquiera' }).eq('id', scan.id);
  check('scan: estado inválido rechazado (CHECK)', !!badEstado, badEstado ? '' : 'aceptó estado inválido');

  // ── Pasar a revisado ────────────────────────────────────────────────────
  const { error: rev } = await sb.from('ocr_scans').update({ estado: 'revisado' }).eq('id', scan.id);
  check('scan: pasar a revisado', !rev, rev?.message);

  // ── Resolver proveedor + crear factura (lo que hace la acción) ──────────
  const { data: prov } = await sb.from('proveedores')
    .insert({ empresa_id: empresaId, nombre: datos.razonSocial, rut: datos.rut }).select('id').single();
  const tasa = Math.round((datos.iva / datos.neto) * 100);
  const { data: facturaId, error: rpcErr } = await sb.rpc('crear_factura_proveedor', {
    p_proveedor_id: prov.id, p_numero_factura: datos.folio, p_monto_total: datos.total, p_tasa_iva: tasa, p_fecha: datos.fecha,
  });
  check('factura: crear_factura_proveedor', !rpcErr && !!facturaId, rpcErr?.message);

  await sb.from('facturas_proveedor').update({ tipo_documento: 'factura' }).eq('id', facturaId);
  const { data: fac } = await sb.from('facturas_proveedor').select('monto_total, monto_iva, tipo_documento').eq('id', facturaId).single();
  check('factura: total 11900 y IVA ~1900', Math.abs(Number(fac.monto_total) - 11900) <= 1 && Math.abs(Number(fac.monto_iva) - 1900) <= 2, JSON.stringify(fac));
  check('factura: tipo_documento = factura', fac?.tipo_documento === 'factura', JSON.stringify(fac));

  // ── Marcar scan importado + link a la factura ───────────────────────────
  const { error: imp } = await sb.from('ocr_scans').update({ estado: 'importado', factura_id: facturaId }).eq('id', scan.id);
  const { data: scanFin } = await sb.from('ocr_scans').select('estado, factura_id').eq('id', scan.id).single();
  check('scan: importado + factura_id enlazado', !imp && scanFin?.estado === 'importado' && scanFin?.factura_id === facturaId, imp?.message || JSON.stringify(scanFin));

  // ── Borrar scan ─────────────────────────────────────────────────────────
  const { error: del } = await sb.from('ocr_scans').delete().eq('id', scan.id);
  check('scan: eliminar', !del, del?.message);
} catch (e) {
  console.error('\n💥 Error:', e.message || e);
  ok = false;
} finally {
  if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
  if (userId) await admin.auth.admin.deleteUser(userId);
}

console.log('\n=== Verificación OCR factura (ocr_scans + registro) ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.e}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
