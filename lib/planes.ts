// Capa de MARKETING de los planes: beneficios legibles y matriz comparativa.
// Fuente única que consumen la landing (`app/page.tsx`), el centro de ayuda y
// `/configuracion/suscripcion`. El precio/nombre vive en `lib/flow/subscription.ts`
// (lógica pura); acá solo se describe el valor de cada plan en lenguaje humano.
import { PLANES, type PlanKey } from './flow/subscription';

export { PLANES };
export type { PlanKey };

/** Beneficios destacados por plan, para las tarjetas de precios. */
export const PLAN_BENEFICIOS: Record<PlanKey, { resumen: string; features: string[] }> = {
  emprende: {
    resumen: 'Todo para vender y ordenar tu negocio.',
    features: [
      'Punto de venta táctil que funciona sin internet',
      'Caja con apertura, cierre y cuadratura',
      'Inventario con alertas de stock bajo',
      'Escáner de códigos de barras y venta a granel',
      'Compras, proveedores y gastos',
      'Escaneo de facturas (OCR) a Cuentas por pagar',
      'Reportes de ventas e IVA (F29), exportables a Excel',
      'Soporte por correo y WhatsApp',
    ],
  },
  pyme: {
    resumen: 'Para equipos: suma usuarios, control y trazabilidad.',
    features: [
      'Todo lo del plan Emprende',
      'Usuarios ilimitados con roles (administrador y empleado)',
      'Reporte de ventas por cajero',
      'Bitácora de cambios (auditoría)',
      'Soporte prioritario',
    ],
  },
};

/** Una celda de la comparativa: incluido / no incluido / detalle en texto. */
export type CeldaComparativa = boolean | string;

/** Matriz comparativa de capacidades (una fila por capacidad). */
export const COMPARATIVA: { etiqueta: string; emprende: CeldaComparativa; pyme: CeldaComparativa }[] = [
  { etiqueta: 'Punto de venta (POS) táctil', emprende: true, pyme: true },
  { etiqueta: 'Funciona sin internet (offline)', emprende: true, pyme: true },
  { etiqueta: 'Caja con cuadratura', emprende: true, pyme: true },
  { etiqueta: 'Inventario y alertas de stock', emprende: true, pyme: true },
  { etiqueta: 'Escáner de códigos + venta a granel', emprende: true, pyme: true },
  { etiqueta: 'Compras, proveedores y gastos', emprende: true, pyme: true },
  { etiqueta: 'Escaneo de facturas (OCR)', emprende: true, pyme: true },
  { etiqueta: 'Reportes e IVA (F29) + exportar a Excel', emprende: true, pyme: true },
  { etiqueta: 'Usuarios y roles', emprende: '1 usuario', pyme: 'Ilimitados' },
  { etiqueta: 'Reporte de ventas por cajero', emprende: false, pyme: true },
  { etiqueta: 'Bitácora de cambios (auditoría)', emprende: false, pyme: true },
  { etiqueta: 'Soporte', emprende: 'Correo y WhatsApp', pyme: 'Prioritario' },
];
