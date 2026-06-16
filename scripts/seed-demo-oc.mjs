// Siembra cuenta DEMO para verificar órdenes de compra en navegador:
// proveedor + 2 productos con control de stock. Emite cookies SSR.
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SVC, { auth: { autoRefreshToken: false, persistSession: false } });
const EMAIL = `demo-oc-${Date.now()}@example.com`, PASS = randomUUID();

const { data: u } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
const userId = u.user.id;
const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
const { data: empresaId } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'Negocio Demo (compras)', p_usa_iva: true });
await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

await sb.from('proveedores').insert({ empresa_id: empresaId, nombre: 'Distribuidora Sur', rut: '77123456-7' });
await sb.from('productos').insert([
  { empresa_id: empresaId, sku: 'CAFE-KG', nombre: 'Café en grano (kg)', precio_total: 12000, precio_neto: 10084, tasa_iva: 19, controla_stock: true, stock_minimo: 5 },
  { empresa_id: empresaId, sku: 'LECHE-L', nombre: 'Leche (litro)', precio_total: 1200, precio_neto: 1008, tasa_iva: 19, controla_stock: true, stock_minimo: 10 },
]);

let captured = [];
const ssr = createServerClient(URL_, ANON, { cookies: { getAll: () => [], setAll: (cks) => { captured = cks; } } });
await ssr.auth.signInWithPassword({ email: EMAIL, password: PASS });
writeFileSync(new URL('./.demo-state.json', import.meta.url), JSON.stringify({ userId, empresaId, email: EMAIL }, null, 2));
console.log(JSON.stringify({ email: EMAIL, cookies: captured.map(({ name, value }) => ({ name, value })) }));
