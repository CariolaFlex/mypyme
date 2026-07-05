'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Wallet, Package, Boxes, Tags, Upload,
  Truck, ClipboardList, ReceiptText, TrendingDown, BarChart3, FileText,
  Building2, CreditCard, Users, Sparkles, LogOut, History, Menu, X,
  LifeBuoy, BookOpen, ScanLine, ScanText, Nfc, HandCoins, ChevronDown, Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/(auth)/actions';
import { ThemeToggle } from '@/components/theme-toggle';

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };
type Grupo = { titulo: string; items: Item[] };

/** Estado de grupos colapsados, persistido para que el usuario arme SU sidebar
 *  (el scroll largo era el principal dolor de navegación). Store externo mínimo
 *  sobre localStorage + useSyncExternalStore: sin setState-en-efecto y sin
 *  mismatch de hidratación (el server siempre ve todo expandido). */
const LS_KEY = 'gestionala-sidebar-colapsados';
const SNAP_SERVIDOR: Record<string, boolean> = {};
let snapColapsados: Record<string, boolean> = SNAP_SERVIDOR;
let snapCargado = false;
const oyentes = new Set<() => void>();

function getColapsados(): Record<string, boolean> {
  if (!snapCargado) {
    try {
      snapColapsados = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Record<string, boolean>;
    } catch {
      snapColapsados = {};
    }
    snapCargado = true;
  }
  return snapColapsados;
}

function setColapsadosStore(next: Record<string, boolean>) {
  snapColapsados = next;
  snapCargado = true;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* modo incógnito sin storage: el estado vive solo en memoria */
  }
  oyentes.forEach((fn) => fn());
}

function suscribirColapsados(fn: () => void) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function AppSidebar({
  empresaNombre, stockBajo, esAdmin,
}: { empresaNombre: string; stockBajo: number; esAdmin: boolean }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState('');
  const colapsados = useSyncExternalStore(suscribirColapsados, getColapsados, () => SNAP_SERVIDOR);

  const grupos: Grupo[] = [
    {
      titulo: 'Operación',
      items: [
        { href: '/inicio', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/pos', label: 'Punto de venta', icon: ShoppingCart },
        { href: '/caja', label: 'Caja', icon: Wallet },
        { href: '/reportes/ventas', label: 'Reportes de ventas', icon: BarChart3 },
        { href: '/reportes/iva', label: 'Reporte IVA (F29)', icon: FileText },
        { href: '/reportes/mercadopago', label: 'Reportes Mercado Pago', icon: Nfc },
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
        { href: '/deudas', label: 'Deudas', icon: HandCoins },
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

  const toggleGrupo = (titulo: string) =>
    setColapsadosStore({ ...colapsados, [titulo]: !colapsados[titulo] });

  // Búsqueda: con texto se ignoran los grupos y se listan los matches planos
  // (normaliza tildes: "categoria" encuentra "Categorías").
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtroNorm = norm(filtro.trim());
  const resultados = filtroNorm
    ? visibles.flatMap((g) => g.items.filter((i) => norm(i.label).includes(filtroNorm)))
    : [];

  const linkItem = (item: Item) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => {
          setAbierto(false);
          setFiltro('');
        }}
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
  };

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

      {/* Buscador de pestañas: llegar a cualquier sección sin scrollear */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar sección…"
            aria-label="Buscar sección"
            className="w-full rounded-lg border border-input bg-input/40 py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-input/70"
          />
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {filtroNorm ? (
          <div className="space-y-0.5">
            {resultados.length ? (
              resultados.map(linkItem)
            ) : (
              <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados para «{filtro}».</p>
            )}
          </div>
        ) : (
          visibles.map((g) => {
            // El grupo de la página activa nunca se colapsa (siempre ves dónde estás).
            const tieneActivo = g.items.some((i) => isActive(i.href));
            const cerrado = !!colapsados[g.titulo] && !tieneActivo;
            return (
              <div key={g.titulo}>
                <button
                  type="button"
                  onClick={() => toggleGrupo(g.titulo)}
                  aria-expanded={!cerrado}
                  className="flex w-full items-center justify-between rounded-md px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  {g.titulo}
                  <ChevronDown
                    className={cn('size-3.5 transition-transform duration-200', cerrado && '-rotate-90')}
                  />
                </button>
                {!cerrado && <div className="space-y-0.5">{g.items.map(linkItem)}</div>}
              </div>
            );
          })
        )}
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

  // Barra inferior móvil: las 4 pantallas del día a día + "Más" (abre el menú
  // completo). Navegación de pulgar, estilo app nativa.
  const tabs: Item[] = [
    { href: '/inicio', label: 'Inicio', icon: LayoutDashboard },
    { href: '/pos', label: 'Vender', icon: ShoppingCart },
    { href: '/caja', label: 'Caja', icon: Wallet },
    { href: '/inventario/stock', label: 'Stock', icon: Boxes, badge: stockBajo },
  ];

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

      {/* Barra inferior móvil (tabs) */}
      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-sidebar/95 pb-[env(safe-area-inset-bottom)] text-sidebar-foreground backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5">
          {tabs.map((t) => {
            const active = isActive(t.href);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors',
                  active ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-5" />
                {t.label}
                {t.badge ? (
                  <span className="absolute right-1/2 top-1 h-4 min-w-4 -translate-y-0.5 translate-x-4 rounded-full bg-destructive px-1 text-center text-[9px] font-semibold leading-4 text-white">
                    {t.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Menu className="size-5" />
            Más
          </button>
        </div>
      </nav>

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
