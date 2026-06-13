import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../(auth)/actions';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/inventario/productos', label: 'Productos' },
  { href: '/inventario/stock', label: 'Inventario' },
  { href: '/inventario/categorias', label: 'Categorías' },
  { href: '/configuracion/negocio', label: 'Negocio' },
  { href: '/configuracion/metodos-pago', label: 'Métodos de pago' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Gate de onboarding: el empresa_id vive en los claims del JWT (Auth Hook).
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id;

  if (!empresaId) {
    redirect('/onboarding');
  }

  // Conteo de productos bajo stock mínimo (para el badge de Inventario).
  const [{ data: productos }, { data: stockRows }] = await Promise.all([
    supabase.from('productos').select('id, stock_minimo').eq('activo', true),
    supabase.from('vw_stock_actual').select('producto_id, stock'),
  ]);
  const stockPorProducto = new Map<string, number>();
  for (const r of stockRows ?? []) {
    stockPorProducto.set(r.producto_id, (stockPorProducto.get(r.producto_id) ?? 0) + Number(r.stock));
  }
  const stockBajo = (productos ?? []).filter(
    (p) => p.stock_minimo != null && (stockPorProducto.get(p.id) ?? 0) <= Number(p.stock_minimo)
  ).length;

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
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                <span>{item.label}</span>
                {item.href === '/inventario/stock' && stockBajo > 0 && (
                  <span className="rounded-full bg-red-600 px-1.5 text-xs font-medium text-white">
                    {stockBajo}
                  </span>
                )}
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
