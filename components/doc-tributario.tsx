'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const selectCls = 'w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs';

export const TIPOS_DOC = [
  ['factura', 'Factura (con crédito fiscal)'],
  ['boleta', 'Boleta'],
  ['factura_exenta', 'Factura exenta'],
  ['boleta_exenta', 'Boleta exenta'],
  ['sin_documento', 'Sin documento'],
] as const;

export const esExento = (t: string) =>
  t === 'factura_exenta' || t === 'boleta_exenta' || t === 'sin_documento';

/**
 * Par de campos «Tipo de documento» + «Tasa IVA %» para formularios con impacto
 * tributario (gastos, facturas de proveedor). Las exentas y «sin documento» fuerzan
 * IVA 0. Solo la factura genera crédito fiscal (se informa al usuario).
 * Renderiza dos celdas → encaja en un grid de 2+ columnas.
 */
export function DocTributario({
  idPrefix = '',
  defaultTipo = 'factura',
  defaultTasa,
}: {
  idPrefix?: string;
  defaultTipo?: string;
  defaultTasa: number;
}) {
  const [tipo, setTipo] = useState(defaultTipo);
  const [tasa, setTasa] = useState(String(defaultTasa));
  const exento = esExento(tipo);

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}tipo_documento`}>Tipo de documento</Label>
        <select
          id={`${idPrefix}tipo_documento`}
          name="tipo_documento"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className={selectCls}
        >
          {TIPOS_DOC.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}tasa_iva`}>Tasa IVA %</Label>
        <Input
          id={`${idPrefix}tasa_iva`}
          name="tasa_iva"
          type="number"
          min="0"
          step="0.01"
          value={exento ? '0' : tasa}
          readOnly={exento}
          onChange={(e) => setTasa(e.target.value)}
        />
        {exento && <p className="text-xs text-muted-foreground">Exento / sin documento: IVA $0.</p>}
        {tipo === 'boleta' && (
          <p className="text-xs text-muted-foreground">La boleta no suma a tu crédito fiscal (F29).</p>
        )}
      </div>
    </>
  );
}
