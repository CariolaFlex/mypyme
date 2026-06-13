// Siembra cuenta DEMO para verificar el POS/caja en navegador:
// categorías + productos + caja ABIERTA. Emite cookies SSR (sin tipear pass).
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
const EMAIL = `demo-pos-${Date.now()}@example.com`, PASS = randomUUID();

const { data: u } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
const userId = u.user.id;

const sb = createClient(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: s1 } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
const { data: empresaId } = await sb.rpc('crear_empresa_y_membresia', { p_rut: '76192083-9', p_razon_social: 'Cafetería Demo (POS)', p_usa_iva: true });
await sb.auth.refreshSession({ refresh_token: s1.session.refresh_token });

// categorías + productos
const { data: cats } = await sb.from('categorias_producto').insert([
  { empresa_id: empresaId, nombre: 'Cafés' },
  { empresa_id: empresaId, nombre: 'Panadería' },
]).select('id, nombre');
const cat = (n) => cats.find((c) => c.nombre === n).id;
await sb.from('productos').insert([
  { empresa_id: empresaId, sku: 'CAPP', nombre: 'Cappuccino', precio_total: 2500, precio_neto: 2101, tasa_iva: 19, controla_stock: false, categoria_id: cat('Cafés') },
  { empresa_id: empresaId, sku: 'LATTE', nombre: 'Latte', precio_total: 2700, precio_neto: 2269, tasa_iva: 19, controla_stock: false, categoria_id: cat('Cafés') },
  { empresa_id: empresaId, sku: 'ESPR', nombre: 'Espresso', precio_total: 1800, precio_neto: 1513, tasa_iva: 19, controla_stock: false, categoria_id: cat('Cafés') },
  { empresa_id: empresaId, sku: 'CROIS', nombre: 'Croissant', precio_total: 1800, precio_neto: 1513, tasa_iva: 19, controla_stock: false, categoria_id: cat('Panadería') },
  { empresa_id: empresaId, sku: 'MUFFIN', nombre: 'Muffin', precio_total: 2000, precio_neto: 1681, tasa_iva: 19, controla_stock: false, categoria_id: cat('Panadería') },
]);

// abrir caja con 20000
await sb.rpc('abrir_caja', { p_monto_apertura: 20000 });

let captured = [];
const ssr = createServerClient(URL_, ANON, { cookies: { getAll: () => [], setAll: (cks) => { captured = cks; } } });
await ssr.auth.signInWithPassword({ email: EMAIL, password: PASS });

writeFileSync(new URL('./.demo-state.json', import.meta.url), JSON.stringify({ userId, empresaId, email: EMAIL }, null, 2));
console.log(JSON.stringify({ email: EMAIL, cookies: captured.map(({ name, value }) => ({ name, value })) }));
