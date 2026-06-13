// Etiquetas y variantes de badge para el estado de una orden de compra.

export const ESTADO_OC: Record<string, string> = {
  borrador: 'Borrador',
  aprobada: 'Aprobada',
  recibida_parcial: 'Recibida parcial',
  recibida: 'Recibida',
  cancelada: 'Cancelada',
};

type Variante = 'default' | 'secondary' | 'destructive' | 'outline';

export function estadoVariante(estado: string): Variante {
  switch (estado) {
    case 'recibida':
    case 'aprobada':
      return 'default';
    case 'recibida_parcial':
      return 'outline';
    case 'cancelada':
      return 'destructive';
    default:
      return 'secondary';
  }
}
