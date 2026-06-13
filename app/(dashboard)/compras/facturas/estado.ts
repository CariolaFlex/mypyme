// Etiquetas y variantes de badge para el estado de una factura de proveedor.

export const ESTADO_FACT: Record<string, string> = {
  pendiente: 'Pendiente',
  pago_parcial: 'Pago parcial',
  pagada: 'Pagada',
  cancelada: 'Cancelada',
};

type Variante = 'default' | 'secondary' | 'destructive' | 'outline';

export function estadoFactVariante(estado: string): Variante {
  switch (estado) {
    case 'pagada':
      return 'default';
    case 'pago_parcial':
      return 'outline';
    case 'cancelada':
      return 'destructive';
    default:
      return 'secondary';
  }
}
