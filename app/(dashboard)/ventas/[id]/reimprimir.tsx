'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imprimirBoleta, type BoletaData } from '@/lib/boleta';

/** Botón cliente: reimprime el comprobante de una venta ya registrada.
 *  Usa el mismo generador que el POS (lib/boleta), con los datos de la venta. */
export function ReimprimirBoleta({ data }: { data: BoletaData }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => imprimirBoleta(data)}>
      <Printer className="size-4" /> Reimprimir comprobante
    </Button>
  );
}
