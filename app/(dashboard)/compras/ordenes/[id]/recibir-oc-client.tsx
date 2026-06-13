'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { recibirOrden } from '../actions';

type LineaPend = { id: string; nombre: string; pendiente: number };

export function RecibirOcClient({ ocId, lineas }: { ocId: string; lineas: LineaPend[] }) {
  // Por defecto, recibir todo lo pendiente de cada línea.
  const [cant, setCant] = useState<Record<string, string>>(
    Object.fromEntries(lineas.map((l) => [l.id, String(l.pendiente)]))
  );

  const recepciones = lineas
    .map((l) => ({ linea_id: l.id, cantidad: Number(cant[l.id]) || 0 }))
    .filter((r) => r.cantidad > 0);

  const algo = recepciones.length > 0;

  return (
    <form action={recibirOrden} className="space-y-3">
      <input type="hidden" name="oc_id" value={ocId} />
      <input type="hidden" name="recepciones" value={JSON.stringify(recepciones)} />
      <div className="space-y-2">
        {lineas.map((l) => (
          <div key={l.id} className="flex items-center gap-3 text-sm">
            <span className="flex-1">{l.nombre}</span>
            <span className="text-muted-foreground">pendiente {l.pendiente}</span>
            <Input
              type="number"
              min="0"
              max={l.pendiente}
              step="0.001"
              value={cant[l.id] ?? ''}
              onChange={(e) => setCant((c) => ({ ...c, [l.id]: e.target.value }))}
              className="w-24"
            />
          </div>
        ))}
      </div>
      <Button type="submit" disabled={!algo}>Registrar recepción</Button>
    </form>
  );
}
