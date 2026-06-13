import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '../(auth)/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/pos', label: 'POS' },
  { href: '/caja', label: 'Caja' },
  { href: '/reportes/ventas', label: 'Reportes' },
  { href: '/inventario/productos', label: 'Productos' },
  { href: '/inventario/stock', label: 'Inventario' },
  { href: '/inventario/categorias', label: 'Categorías' },
  { href: '/compras/proveedores', label: 'Proveedores' },
  { href: '/gastos', label: 'Gastos' },
  { href: '/configuracion/negocio', label: 'Negocio' },
  { href: '/configuracion/metodos-pago', label: 'Métodos de pago' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id;
  if (!empresaId) {
    redirect('/onboarding');
  }

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
      <aside className="flex w-60 flex-col justify-between border-r bg-sidebar p-4 text-sidebar-foreground">
        <div className="space-y-6">
          <div className="px-2 text-lg font-bold">mypyme</div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span>{item.label}</span>
                {item.href === '/inventario/stock' && stockBajo > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1">
                    {stockBajo}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
