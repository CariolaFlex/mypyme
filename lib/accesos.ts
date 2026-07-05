/**
 * Catálogo compartido de los accesos rápidos del dashboard: íconos disponibles,
 * paleta de colores (gradientes) y destinos internos sugeridos. Módulo client-safe
 * (sin imports de servidor) — lo usan el picker y el render de los botones.
 */

import {
  Zap, ShoppingCart, Wallet, Package, Boxes, Tags, Truck, ClipboardList,
  ReceiptText, TrendingDown, HandCoins, BarChart3, FileText, ScanLine,
  ScanText, Users, CreditCard, Building2, Star, Bell, CalendarDays, Box,
  DollarSign, PiggyBank, Percent, Store, Coffee, Wrench,
  type LucideIcon,
} from 'lucide-react';

/** Íconos elegibles (nombre estable → componente). El nombre se guarda en la DB;
 *  si alguno se retira, el fallback es Zap. */
export const ICONOS: Record<string, LucideIcon> = {
  Zap, ShoppingCart, Wallet, Package, Boxes, Tags, Truck, ClipboardList,
  ReceiptText, TrendingDown, HandCoins, BarChart3, FileText, ScanLine,
  ScanText, Users, CreditCard, Building2, Star, Bell, CalendarDays, Box,
  DollarSign, PiggyBank, Percent, Store, Coffee, Wrench,
};

export function iconoDe(nombre: string): LucideIcon {
  return ICONOS[nombre] ?? Zap;
}

export const NOMBRES_ICONO = Object.keys(ICONOS);

/** Paleta: cada color → clases del badge (gradiente) y un anillo suave para el
 *  hover de la tarjeta. Tailwind necesita las clases literales (no dinámicas). */
export const COLORES: Record<string, { badge: string; ring: string; label: string }> = {
  blue: { badge: 'from-blue-500 to-blue-700', ring: 'hover:ring-blue-500/30', label: 'Azul' },
  emerald: { badge: 'from-emerald-500 to-emerald-700', ring: 'hover:ring-emerald-500/30', label: 'Verde' },
  violet: { badge: 'from-violet-500 to-violet-700', ring: 'hover:ring-violet-500/30', label: 'Violeta' },
  amber: { badge: 'from-amber-500 to-amber-600', ring: 'hover:ring-amber-500/30', label: 'Ámbar' },
  rose: { badge: 'from-rose-500 to-rose-700', ring: 'hover:ring-rose-500/30', label: 'Rosa' },
  cyan: { badge: 'from-cyan-500 to-cyan-700', ring: 'hover:ring-cyan-500/30', label: 'Cian' },
  orange: { badge: 'from-orange-500 to-orange-600', ring: 'hover:ring-orange-500/30', label: 'Naranjo' },
  slate: { badge: 'from-slate-500 to-slate-700', ring: 'hover:ring-slate-500/30', label: 'Gris' },
};

export const NOMBRES_COLOR = Object.keys(COLORES);

export function colorDe(nombre: string) {
  return COLORES[nombre] ?? COLORES.blue;
}

/** Destinos internos frecuentes (para el selector; el usuario también puede
 *  pegar una URL externa). El ícono es solo la sugerencia inicial del picker. */
export const DESTINOS_SUGERIDOS: { destino: string; label: string; icono: string }[] = [
  { destino: '/pos', label: 'Punto de venta', icono: 'ShoppingCart' },
  { destino: '/caja', label: 'Caja', icono: 'Wallet' },
  { destino: '/inventario/stock', label: 'Inventario', icono: 'Boxes' },
  { destino: '/inventario/productos', label: 'Productos', icono: 'Package' },
  { destino: '/inventario/escaneo-rapido', label: 'Escaneo rápido', icono: 'ScanLine' },
  { destino: '/compras/escanear-factura', label: 'Ingresar compra', icono: 'ScanText' },
  { destino: '/compras/facturas', label: 'Cuentas por pagar', icono: 'ReceiptText' },
  { destino: '/compras/proveedores', label: 'Proveedores', icono: 'Truck' },
  { destino: '/gastos', label: 'Gastos', icono: 'TrendingDown' },
  { destino: '/deudas', label: 'Deudas', icono: 'HandCoins' },
  { destino: '/reportes/ventas', label: 'Reportes de ventas', icono: 'BarChart3' },
  { destino: '/reportes/iva', label: 'Reporte IVA (F29)', icono: 'FileText' },
];

export interface AccesoRapido {
  id: string;
  etiqueta: string;
  icono: string;
  destino: string;
  color: string;
  orden: number;
}

/** Valida y normaliza un destino: ruta interna (empieza con '/') o URL http(s).
 *  Devuelve null si no es ninguno (el caller rechaza). */
export function normalizarDestino(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith('/')) return t.slice(0, 300);
  try {
    const u = new URL(t);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href.slice(0, 300);
  } catch {
    /* no es URL */
  }
  return null;
}

/** true si el destino es externo (abre en pestaña nueva). */
export function esExterno(destino: string): boolean {
  return /^https?:\/\//i.test(destino);
}
