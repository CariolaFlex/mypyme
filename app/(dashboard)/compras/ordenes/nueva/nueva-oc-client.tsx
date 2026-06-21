'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { crearOrden } from '../actions';

type Proveedor = { id: string; nombre: string };
type Producto = { id: string; nombre: string; tasa_iva: number | null };
type Row = { key: string; productoId: string; cantidad: string; costo: string; tasa: string };

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export function NuevaOcClient({
  proveedores,
  productos,
  ivaDefault,
}: {
  proveedores: Proveedor[];
  productos: Producto[];
  ivaDefault: number;
}) {
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id ?? '');
  const [fechaEsperada, setFechaEsperada] = useState('');
  const [rows, setRows] = useState<Row[]>([
    { key: 'r0', productoId: '', cantidad: '', costo: '', tasa: String(ivaDefault) },
  ]);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { key: `r${Date.now()}`, productoId: '', cantidad: '', costo: '', tasa: String(ivaDefault) }]);
  const removeRow = (key: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const calc = (r: Row) => {
    const neto = (Number(r.cantidad) || 0) * (Number(r.costo) || 0);
    const iva = (neto * (Number(r.tasa) || 0)) / 100;
    return { neto, iva, total: neto + iva };
  };
  const totales = rows.reduce(
    (acc, r) => {
      const c = calc(r);
      return { neto: acc.neto + c.neto, iva: acc.iva + c.iva, total: acc.total + c.total };
    },
    { neto: 0, iva: 0, total: 0 }
  );

  const lineasValidas = rows
    .filter((r) => r.productoId && Number(r.cantidad) > 0 && Number(r.costo) >= 0)
    .map((r) => ({
      producto_id: r.productoId,
      cantidad: Number(r.cantidad),
      costo_neto_unit: Number(r.costo),
      tasa_iva: Number(r.tasa) || 0,
    }));

  return (
    <form action={crearOrden} className="space-y-4">
      <input type="hidden" name="proveedor_id" value={proveedorId} />
      <input type="hidden" name="fecha_esperada" value={fechaEsperada} />
      <input type="hidden" name="lineas" value={JSON.stringify(lineasValidas)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proveedor">Proveedor *</Label>
          <select
            id="proveedor"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
          >
            {proveedores.length === 0 && <option value="">— Crea un proveedor primero —</option>}
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha_esperada">Fecha esperada</Label>
          <Input id="fecha_esperada" type="date" value={fechaEsperada} onChange={(e) => setFechaEsperada(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Líneas</div>
        {rows.map((r) => {
          const c = calc(r);
          return (
            <div key={r.key} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
              <div className="min-w-40 flex-1 space-y-1">
                <Label className="text-xs">Producto</Label>
                <select
                  value={r.productoId}
                  onChange={(e) => {
                    const prod = productos.find((p) => p.id === e.target.value);
                    update(r.key, { productoId: e.target.value, tasa: String(prod?.tasa_iva ?? ivaDefault) });
                  }}
                  className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
                >
                  <option value="">— Selecciona —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" min="0" step="0.001" value={r.cantidad} onChange={(e) => update(r.key, { cantidad: e.target.value })} />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Costo neto</Label>
                <Input type="number" min="0" value={r.costo} onChange={(e) => update(r.key, { costo: e.target.value })} />
              </div>
              <div className="w-16 space-y-1">
                <Label className="text-xs">IVA %</Label>
                <Input type="number" min="0" step="0.01" value={r.tasa} onChange={(e) => update(r.key, { tasa: e.target.value })} />
              </div>
              <div className="w-24 space-y-1 text-right">
                <Label className="text-xs">Total</Label>
                <div className="py-2 text-sm tabular-nums">{clp.format(c.total)}</div>
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => removeRow(r.key)}>×</Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Agregar línea</Button>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-sm text-muted-foreground">
          Neto {clp.format(totales.neto)} · IVA {clp.format(totales.iva)}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-lg font-bold tabular-nums">{clp.format(totales.total)}</div>
          <Button type="submit" disabled={!proveedorId || lineasValidas.length === 0}>
            Crear orden
          </Button>
        </div>
      </div>
    </form>
  );
}
