'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TIPOS_DOC, esExento } from '@/components/doc-tributario';

const selectCls = 'w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs';
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

/**
 * Bloque de monto + IVA para formularios con impacto tributario (factura de
 * proveedor, gasto). Reemplaza al par «monto total» + `DocTributario`: deja
 * elegir si el monto **incluye IVA, es neto o exento**, con la tasa por defecto
 * del negocio (editable). Emite los MISMOS campos ocultos que esperan las server
 * actions (`monto_total` bruto, `tasa_iva` efectiva, `tipo_documento`), así que
 * es un drop-in sin tocar el backend. Renderiza una celda full-width.
 */
export function MontoTributario({
  idPrefix = '',
  defaultTasa,
  defaultTipo = 'factura',
}: {
  idPrefix?: string;
  defaultTasa: number;
  defaultTipo?: string;
}) {
  const [tipo, setTipo] = useState(defaultTipo);
  const [modo, setModo] = useState<'con' | 'sin'>('con');
  const [montoStr, setMontoStr] = useState('');
  const [tasaStr, setTasaStr] = useState(String(defaultTasa));

  const exento = esExento(tipo);
  const tasa = exento ? 0 : Number(tasaStr) || 0;
  const monto = Number(montoStr) || 0;
  const total = exento || modo === 'con' ? monto : Math.round(monto * (1 + tasa / 100));
  const neto = exento ? total : modo === 'con' ? Math.round(total / (1 + tasa / 100)) : monto;
  const iva = total - neto;

  return (
    <div className="space-y-3 rounded-md border bg-muted/10 p-3 sm:col-span-2">
      {/* Campos que leen las server actions */}
      <input type="hidden" name="monto_total" value={total} />
      <input type="hidden" name="tasa_iva" value={tasa} />
      <input type="hidden" name="tipo_documento" value={tipo} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}tipo`}>Tipo de documento</Label>
          <select
            id={`${idPrefix}tipo`}
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
        {!exento && (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}tasa`}>Tasa IVA %</Label>
            <Input
              id={`${idPrefix}tasa`}
              type="number"
              min="0"
              step="0.01"
              value={tasaStr}
              onChange={(e) => setTasaStr(e.target.value)}
            />
          </div>
        )}
      </div>

      {!exento && (
        <div className="grid grid-cols-2 gap-2">
          {([['con', 'Incluye IVA'], ['sin', 'Sin IVA (neto)']] as const).map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => setModo(v)}
              className={`rounded-lg border px-2 py-2 text-xs transition-colors ${
                modo === v
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-input bg-input/40 hover:bg-muted'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}monto`}>
          {exento ? 'Monto (exento)' : modo === 'sin' ? 'Monto neto' : 'Total (con IVA)'} *
        </Label>
        <Input
          id={`${idPrefix}monto`}
          type="number"
          min="1"
          required
          value={montoStr}
          onChange={(e) => setMontoStr(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-background/60 px-3 py-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Neto</span>
          <span className="tabular-nums">{clp.format(neto)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">IVA</span>
          <span className="tabular-nums">{clp.format(iva)}</span>
        </div>
        <div className="mt-0.5 flex justify-between border-t pt-0.5 font-medium">
          <span>Total</span>
          <span className="tabular-nums">{clp.format(total)}</span>
        </div>
      </div>

      {tipo === 'boleta' && (
        <p className="text-xs text-muted-foreground">La boleta no suma a tu crédito fiscal (F29).</p>
      )}
    </div>
  );
}
