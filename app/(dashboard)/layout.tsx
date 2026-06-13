import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../(auth)/actions';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/configuracion/negocio', label: 'Negocio' },
  { href: '/configuracion/usuarios', label: 'Usuarios' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Gate de onboarding: el empresa_id vive en los claims del JWT (Auth Hook).
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id;

  if (!empresaId) {
    redirect('/onboarding');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r p-4">
        <div className="space-y-6">
          <div className="text-lg font-bold">mypyme</div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
