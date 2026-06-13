import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function checkSupabase(): Promise<{ ok: boolean; detail: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, detail: 'Faltan variables de entorno en .env.local' };
  }
  try {
    const supabase = await createClient();
    // Sin sesión, RLS devuelve 0 filas pero NO error → conexión OK.
    const { error } = await supabase.from('empresas').select('id').limit(1);
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: 'Conexión y RLS operativos' };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export default async function Home() {
  const status = await checkSupabase();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">mypyme</h1>
      <p className="text-sm text-gray-500">SaaS POS para PyMEs · Fase 0</p>

      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
          status.ok
            ? 'border-green-600/30 bg-green-600/10 text-green-700'
            : 'border-red-600/30 bg-red-600/10 text-red-700'
        }`}
      >
        <span className="font-mono">{status.ok ? '● Supabase OK' : '● Supabase ERROR'}</span>
        <span className="opacity-70">{status.detail}</span>
      </div>
    </main>
  );
}
