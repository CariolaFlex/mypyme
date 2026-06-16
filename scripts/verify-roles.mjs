// Verificación e2e de roles (Sprint 1B): el empleado puede escribir datos
// operativos (con auditoría) pero NO las zonas de control (admin). LIMPIA todo.
//
// Uso: node scripts/verify-roles.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { persistSession: false } });

const t = Date.now();
const ADM = `roles-adm-${t}@example.com`;
const EMP = `roles-emp-${t}@example.com`;
const PASS = 'Test1234!';

let uAdm, uEmp, empresa, ok = true;
const results = [];
const check = (n, c, x = '') => { results.push({ n, c: !!c, x }); if (!c) ok = false; };

async function nuevo(email) { const { data } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true }); return data.user.id; }

try {
  // Admin + empresa
  uAdm = await nuevo(ADM);
  const sbA = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: sa } = await sbA.auth.signInWithPassword({ email: ADM, password: PASS });
  const { data: eid, error: oe } = await sbA.rpc('crear_empresa_y_membresia', { p_rut: '99999999-9', p_razon_social: 'Negocio Roles', p_usa_iva: true });
  if (oe) throw oe;
  empresa = eid;
  await sbA.auth.refreshSession({ refresh_token: sa.session.refresh_token });

  // Empleado
  uEmp = await nuevo(EMP);
  await admin.from('usuarios_empresa').insert({ usuario_id: uEmp, empresa_id: empresa, rol: 'empleado' });
  const sbE = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: se } = await sbE.auth.signInWithPassword({ email: EMP, password: PASS });
  await sbE.auth.refreshSession({ refresh_token: se.session.refresh_token });

  // --- OPERATIVO: el empleado SÍ puede ---
  const { data: prod, error: e1 } = await sbE.from('productos')
    .insert({ empresa_id: empresa, sku: 'EMP1', nombre: 'Producto empleado', precio_total: 1000, precio_neto: 840, tasa_iva: 19, controla_stock: false })
    .select('id').single();
  check('empleado crea producto', !e1 && prod?.id, e1?.message);

  const { error: e2 } = await sbE.from('productos').update({ precio_total: 1200 }).eq('id', prod?.id);
  check('empleado edita producto', !e2, e2?.message);

  const { error: e3 } = await sbE.from('productos').update({ activo: false }).eq('id', prod?.id);
  check('empleado desactiva (borra) producto', !e3, e3?.message);

  const { error: e4 } = await sbE.from('proveedores').insert({ empresa_id: empresa, nombre: 'Proveedor empleado' });
  check('empleado crea proveedor', !e4, e4?.message);

  const { data: cats } = await sbE.from('categorias_gasto').select('id').limit(1);
  const { error: e5 } = await sbE.rpc('registrar_gasto', {
    p_categoria_gasto_id: cats?.[0]?.id, p_descripcion: 'Gasto empleado', p_monto_total: 5000, p_tasa_iva: 19,
  });
  check('empleado registra gasto', !e5, e5?.message);

  // --- CONTROL: el empleado NO puede ---
  const { error: c1 } = await sbE.from('metodos_pago').insert({ empresa_id: empresa, nombre: 'Hack', tipo: 'cash' });
  check('empleado NO crea método de pago', !!c1, c1 ? 'rechazó OK' : 'permitió (MAL)');

  const { error: c2 } = await sbE.from('configuracion_negocio').update({ tasa_iva_default: 5 }).eq('empresa_id', empresa);
  // update sin error pero 0 filas también cuenta como bloqueado; comprobamos que NO cambió
  const { data: cfg } = await admin.from('configuracion_negocio').select('tasa_iva_default').eq('empresa_id', empresa).single();
  check('empleado NO cambia configuración', !!c2 || Number(cfg.tasa_iva_default) === 19, `err=${c2?.code} tasa=${cfg?.tasa_iva_default}`);

  const { error: c3 } = await sbE.from('usuarios_empresa').insert({ usuario_id: uAdm, empresa_id: empresa, rol: 'admin' });
  check('empleado NO agrega usuarios', !!c3, c3 ? 'rechazó OK' : 'permitió (MAL)');

  // El admin SÍ puede método de pago (control)
  const { error: a1 } = await sbA.from('metodos_pago').insert({ empresa_id: empresa, nombre: 'App MP', tipo: 'other' });
  check('admin SÍ crea método de pago', !a1, a1?.message);
} catch (err) {
  console.error('💥', err.message || err);
  ok = false;
} finally {
  if (empresa) { await admin.from('empresas').delete().eq('id', empresa); await admin.from('auditoria').delete().eq('empresa_id', empresa); }
  for (const u of [uAdm, uEmp]) if (u) await admin.auth.admin.deleteUser(u);
}

console.log('\n=== Resultados verificación roles ===');
for (const r of results) console.log(`${r.c ? '✅' : '❌'} ${r.n}${r.c ? '' : '  → ' + r.x}`);
const passed = results.filter((r) => r.c).length;
console.log(`\n${passed}/${results.length} checks OK`);
process.exit(ok && passed === results.length ? 0 : 1);
