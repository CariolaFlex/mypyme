import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con service_role — BYPASEA RLS.
 * Úsalo SOLO en código de servidor (Route Handlers, Server Actions, webhooks).
 * NUNCA importar desde un componente cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
