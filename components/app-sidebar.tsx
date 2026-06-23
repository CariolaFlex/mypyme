'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Wallet, Package, Boxes, Tags, Upload,
  Truck, ClipboardList, ReceiptText, TrendingDown, BarChart3, FileText,
  Building2, CreditCard, Users, Sparkles, LogOut, History, Menu, X,
  LifeBuoy, BookOpen, ScanLine, ScanText, Nfc,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/(auth)/actions';
import { ThemeToggle } from '@/components/theme-toggle';

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };
type Grupo = { titulo: string; items: Item[] };

export function AppSidebar({
  empresaNombre, stockBajo, esAdmin,
}: { empresaNombre: string; stockBajo: number; esAdmin: boolean }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  const grupos: Grupo[] = [
    {
      titulo: 'Operación',
      items: [
        { href: '/inicio', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/pos', label: 'Punto de venta', icon: ShoppingCart },
        { href: '/caja', label: 'Caja', icon: Wallet },
        { href: '/reportes/ventas', label: 'Reportes de ventas', icon: BarChart3 },
        { href: '/reportes/iva', label: 'Reporte IVA (F29)', icon: FileText },
      ],
    },
    {
      titulo: 'Catálogo',
      items: [
        { href: '/inventario/productos', label: 'Productos', icon: Package },
        { href: '/inventario/escaneo-rapido', label: 'Escaneo rápido', icon: ScanLine },
        { href: '/inventario/stock', label: 'Inventario', icon: Boxes, badge: stockBajo },
        { href: '/inventario/categorias', label: 'Categorías', icon: Tags },
        { href: '/inventario/importar', label: 'Importar catálogo', icon: Upload },
      ],
    },
    {
      titulo: 'Compras',
      items: [
        { href: '/compras/escanear-factura', label: 'Ingresar compra', icon: ScanText },
        { href: '/compras/facturas', label: 'Cuentas por pagar', icon: ReceiptText },
        { href: '/compras/proveedores', label: 'Proveedores', icon: Truck },
        { href: '/compras/ordenes', label: 'Órdenes de compra', icon: ClipboardList },
        { href: '/gastos', label: 'Gastos', icon: TrendingDown },
      ],
    },
    {
      titulo: 'Configuración',
      items: [
        { href: '/configuracion/negocio', label: 'Negocio', icon: Building2 },
        { href: '/configuracion/metodos-pago', label: 'Métodos de pago', icon: CreditCard },
        { href: '/configuracion/mercadopago', label: 'Mercado Pago', icon: Nfc },
        { href: '/configuracion/usuarios', label: 'Usuarios', icon: Users },
        { href: '/configuracion/auditoria', label: 'Bitácora', icon: History },
        { href: '/configuracion/suscripcion', label: 'Suscripción', icon: Sparkles },
      ],
    },
  ];

  // Empleados no ven la zona de control (Configuración).
  const visibles = esAdmin ? grupos : grupos.filter((g) => g.titulo !== 'Configuración');

  const isActive = (href: string) =>
    href === '/inicio' ? pathname === '/inicio' : pathname === href || pathname.startsWith(href + '/');

  const contenido = (
    <>
      {/* Marca */}
      <div className="flex items-center gap-3 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icon-192.png" alt="Gestionala" className="size-9 rounded-xl shadow-sm" />
        <div className="min-w-0">
          <div className="text-base font-bold leading-none tracking-tight">Gestionala</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">{empresaNombre}</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {visibles.map((g) => (
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
                    onClick={() => setAbierto(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                      active
                        ? 'grad-brand-vivid font-medium text-white shadow-md shadow-primary/30'
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
      <div className="space-y-1 border-t p-3">
        <Link
          href="/ayuda"
          onClick={() => setAbierto(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive('/ayuda')
              ? 'grad-brand-vivid font-medium text-white shadow-md shadow-primary/30'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
          )}
        >
          <BookOpen className="size-4" />
          Centro de ayuda
        </Link>
        <Link
          href="/soporte"
          onClick={() => setAbierto(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            isActive('/soporte')
              ? 'grad-brand-vivid font-medium text-white shadow-md shadow-primary/30'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
          )}
        >
          <LifeBuoy className="size-4" />
          Soporte
        </Link>
        <ThemeToggle />
        <form action={logout}>
          <Button type="submit" variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Sidebar de escritorio */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex">
        {contenido}
      </aside>

      {/* Barra superior móvil */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-192.png" alt="Gestionala" className="size-7 rounded-lg" />
          <span className="font-bold tracking-tight">Gestionala</span>
        </div>
      </div>

      {/* Drawer móvil */}
      {abierto && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl duration-200 animate-in slide-in-from-left">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <X className="size-5" />
            </button>
            {contenido}
          </aside>
        </div>
      )}
    </>
  );
}
