// Borra la cuenta DEMO sembrada por seed-demo.mjs (empresa en cascada + usuario auth).
import { createClient } from '@supabase/supabase-js';
import { readFileSync, rmSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });

const stateUrl = new URL('./.demo-state.json', import.meta.url);
const { userId, empresaId, email } = JSON.parse(readFileSync(stateUrl, 'utf8'));

if (empresaId) await admin.from('empresas').delete().eq('id', empresaId);
// auditoria no tiene FK a empresas → limpiar sus filas a mano tras el cascade.
if (empresaId) await admin.from('auditoria').delete().eq('empresa_id', empresaId);
if (userId) await admin.auth.admin.deleteUser(userId);
rmSync(stateUrl);
console.log(`Demo eliminada: ${email}`);
