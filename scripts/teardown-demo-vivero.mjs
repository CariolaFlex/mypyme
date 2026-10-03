// Borra la empresa DEMO "Vivero Demo" sembrada por seed-demo-vivero.mjs
// (empresa en cascada + auditoría + usuario auth) y su archivo de credenciales.
import { createClient } from '@supabase/supabase-js';
import { readFileSync, rmSync, existsSync } from 'node:fs';

const parse = (path) => Object.fromEntries(
  readFileSync(new URL(path, import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const env = parse('../.env.local');
const DEMO_FILE = new URL('../.env.demo.local', import.meta.url);
if (!existsSync(DEMO_FILE)) { console.log('No hay demo vivero que borrar.'); process.exit(0); }
const demo = parse('../.env.demo.local');

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });

if (demo.DEMO_VIVERO_EMPRESA_ID) {
  await admin.from('empresas').delete().eq('id', demo.DEMO_VIVERO_EMPRESA_ID);
  // auditoria no tiene FK a empresas → limpiar sus filas a mano tras el cascade.
  await admin.from('auditoria').delete().eq('empresa_id', demo.DEMO_VIVERO_EMPRESA_ID);
}
if (demo.DEMO_VIVERO_USER_ID) await admin.auth.admin.deleteUser(demo.DEMO_VIVERO_USER_ID);
rmSync(DEMO_FILE);
console.log(`Demo vivero eliminada: ${demo.DEMO_VIVERO_EMAIL}`);
