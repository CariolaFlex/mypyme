'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Wallet, Package, Boxes, Tags, Upload,
  Truck, ClipboardList, ReceiptText, TrendingDown, BarChart3,
  Building2, CreditCard, Users, Sparkles, LogOut, Store, History,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/(auth)/actions';

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };
type Grupo = { titulo: string; items: Item[] };

export function AppSidebar({ empresaNombre, stockBajo }: { empresaNombre: string; stockBajo: number }) {
  const pathname = usePathname();

  const grupos: Grupo[] = [
    {
      titulo: 'Operación',
      items: [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/pos', label: 'Punto de venta', icon: ShoppingCart },
        { href: '/caja', label: 'Caja', icon: Wallet },
        { href: '/reportes/ventas', label: 'Reportes', icon: BarChart3 },
      ],
    },
    {
      titulo: 'Catálogo',
      items: [
        { href: '/inventario/productos', label: 'Productos', icon: Package },
        { href: '/inventario/stock', label: 'Inventario', icon: Boxes, badge: stockBajo },
        { href: '/inventario/categorias', label: 'Categorías', icon: Tags },
        { href: '/inventario/importar', label: 'Importar catálogo', icon: Upload },
      ],
    },
    {
      titulo: 'Compras y gastos',
      items: [
        { href: '/compras/proveedores', label: 'Proveedores', icon: Truck },
        { href: '/compras/ordenes', label: 'Órdenes de compra', icon: ClipboardList },
        { href: '/compras/facturas', label: 'Cuentas por pagar', icon: ReceiptText },
        { href: '/gastos', label: 'Gastos', icon: TrendingDown },
      ],
    },
    {
      titulo: 'Configuración',
      items: [
        { href: '/configuracion/negocio', label: 'Negocio', icon: Building2 },
        { href: '/configuracion/metodos-pago', label: 'Métodos de pago', icon: CreditCard },
        { href: '/configuracion/usuarios', label: 'Usuarios', icon: Users },
        { href: '/configuracion/auditoria', label: 'Bitácora', icon: History },
        { href: '/configuracion/suscripcion', label: 'Suscripción', icon: Sparkles },
      ],
    },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Store className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-bold leading-none tracking-tight">mypyme</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{empresaNombre}</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g.titulo}
            </div>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                      active
                        ? 'bg-primary font-medium text-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                        active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground'
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <Badge
                        variant={active ? 'secondary' : 'destructive'}
                        className="h-5 min-w-5 justify-center px-1 text-[10px]"
                      >
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sesión */}
      <div className="border-t p-3">
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </aside>
  );
}
