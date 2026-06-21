'use client';

import { useState } from 'react';
import { ScanLine, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { BarcodeScannerModal } from '@/components/scanner/barcode-scanner-modal';
import { buscarPorCodigo } from '@/lib/openfoodfacts';
import { agregarRapido } from '../productos/actions';

type Agregado = { nombre: string };

export function EscaneoRapido() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState({ codigo: '', nombre: '', precio: '', cantidad: '' });
  const [agregados, setAgregados] = useState<Agregado[]>([]);

  async function onScan(code: string) {
    setScannerOpen(false);
    // ¿Ya existe en el catálogo? → no duplicar; avisar y volver a escanear.
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('productos')
        .select('nombre')
        .eq('codigo_barras', code)
        .limit(1);
      if (data?.[0]) {
        toast.warning(`«${data[0].nombre}» ya existe. Ajusta su stock desde Inventario.`);
        return;
      }
    } catch {
      /* sigue: el alta validará igual */
    }
    // Enriquecer con Open Food Facts (best-effort).
    const off = await buscarPorCodigo(code);
    setCur({ codigo: code, nombre: off?.nombre ?? '', precio: '', cantidad: '' });
    setShowForm(true);
  }

  async function guardar() {
    setBusy(true);
    const res = await agregarRapido({
      codigo_barras: cur.codigo,
      nombre: cur.nombre,
      precio_total: Number(cur.precio),
      cantidad: cur.cantidad ? Number(cur.cantidad) : undefined,
    });
    setBusy(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    setAgregados((p) => [{ nombre: res.nombre }, ...p]);
    toast.success(`Agregado: ${res.nombre}`);
    setShowForm(false);
    setCur({ codigo: '', nombre: '', precio: '', cantidad: '' });
    setScannerOpen(true); // sigue el loop: abre la cámara para el siguiente
  }

  return (
    <div className="space-y-5">
      {!showForm && (
        <Button type="button" size="lg" className="w-full gap-2" onClick={() => setScannerOpen(true)}>
          <ScanLine className="size-5" />
          Escanear producto
        </Button>
      )}

      {showForm && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            Código: <span className="font-mono">{cur.codigo}</span>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="r-nombre">Nombre</Label>
            <Input
              id="r-nombre"
              value={cur.nombre}
              onChange={(e) => setCur((c) => ({ ...c, nombre: e.target.value }))}
              autoFocus
              placeholder="Nombre del producto"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="r-precio">Precio (c/IVA)</Label>
              <Input
                id="r-precio"
                type="number"
                min="0"
                step="1"
                value={cur.precio}
                onChange={(e) => setCur((c) => ({ ...c, precio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-cantidad">Cantidad inicial</Label>
              <Input
                id="r-cantidad"
                type="number"
                min="0"
                value={cur.cantidad}
                onChange={(e) => setCur((c) => ({ ...c, cantidad: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setCur({ codigo: '', nombre: '', precio: '', cantidad: '' });
              }}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={guardar} className="gap-2">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Guardar y escanear siguiente
            </Button>
          </div>
        </div>
      )}

      {agregados.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-4 py-2 text-sm font-medium">
            Agregados en esta sesión ({agregados.length})
          </div>
          <ul className="divide-y text-sm">
            {agregados.map((a, i) => (
              <li key={i} className="flex items-center gap-2 px-4 py-2">
                <Check className="size-4 text-emerald-600" />
                {a.nombre}
              </li>
            ))}
          </ul>
        </div>
      )}

      <BarcodeScannerModal open={scannerOpen} onScan={onScan} onClose={() => setScannerOpen(false)} />
    </div>
  );
}
