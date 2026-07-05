'use client';

import { useState } from 'react';
import { HandCoins, Trash2, History } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { abonarDeuda, eliminarDeuda } from './actions';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

type Abono = { id: string; fecha: string; monto: number; nota: string | null };

/** Acciones por fila: abonar (modal con monto/nota + historial de abonos) y
 *  eliminar (confirmación). Las server actions redirigen y revalidan solas. */
export function DeudaRowActions({
  deuda,
}: {
  deuda: { id: string; contraparte: string; saldo: number; estado: string };
}) {
  const [abonarOpen, setAbonarOpen] = useState(false);
  const [borrarOpen, setBorrarOpen] = useState(false);
  const [abonos, setAbonos] = useState<Abono[] | null>(null);

  // Historial bajo demanda (evita traer todos los abonos en el listado).
  async function cargarAbonos() {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('abonos_deuda')
        .select('id, fecha, monto, nota')
        .eq('deuda_id', deuda.id)
        .order('creado_en', { ascending: false });
      setAbonos((data as Abono[] | null) ?? []);
    } catch {
      setAbonos([]);
    }
  }

  return (
    <div className="flex justify-end gap-1">
      {deuda.estado !== 'pagada' && (
        <button
          type="button"
          onClick={() => { setAbonarOpen(true); void cargarAbonos(); }}
          aria-label="Abonar"
          title="Abonar"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HandCoins className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setBorrarOpen(true)}
        aria-label="Eliminar"
        title="Eliminar"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>

      <Modal open={abonarOpen} onClose={() => setAbonarOpen(false)} title={`Abonar — ${deuda.contraparte}`}>
        <form action={abonarDeuda} className="space-y-3">
          <input type="hidden" name="deuda_id" value={deuda.id} />
          <p className="text-sm text-muted-foreground">
            Saldo pendiente: <strong className="text-foreground">{clp.format(deuda.saldo)}</strong>
          </p>
          <div className="space-y-1.5">
            <Label htmlFor={`abono-${deuda.id}`}>Monto del abono *</Label>
            <Input
              id={`abono-${deuda.id}`}
              name="monto"
              type="number"
              min="1"
              max={deuda.saldo}
              required
              autoFocus
              placeholder={String(deuda.saldo)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`nota-${deuda.id}`}>Nota (opcional)</Label>
            <Input id={`nota-${deuda.id}`} name="nota" placeholder="Ej. Transferencia, efectivo…" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAbonarOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar abono</Button>
          </div>
          {abonos && abonos.length > 0 && (
            <div className="rounded-md border text-xs">
              <p className="flex items-center gap-1.5 border-b px-3 py-1.5 font-medium text-muted-foreground">
                <History className="size-3.5" /> Abonos anteriores
              </p>
              <ul className="max-h-32 divide-y overflow-auto">
                {abonos.map((a) => (
                  <li key={a.id} className="flex justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">
                      {a.fecha}
                      {a.nota ? ` · ${a.nota}` : ''}
                    </span>
                    <span>{clp.format(Number(a.monto))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </Modal>

      <Modal open={borrarOpen} onClose={() => setBorrarOpen(false)} title="Eliminar deuda">
        <form action={eliminarDeuda} className="space-y-4">
          <input type="hidden" name="id" value={deuda.id} />
          <p className="text-sm">
            ¿Eliminar la deuda de <strong>{deuda.contraparte}</strong>? Se borra también su
            historial de abonos. Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBorrarOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive">
              Eliminar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
