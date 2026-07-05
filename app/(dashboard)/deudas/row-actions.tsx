'use client';

import { useState } from 'react';
import { HandCoins, Trash2, History, Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { abonarDeuda, editarDeuda, eliminarDeuda } from './actions';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

type Abono = { id: string; fecha: string; monto: number; nota: string | null };

export type DeudaFull = {
  id: string;
  tipo: 'por_cobrar' | 'por_pagar';
  categoria: string;
  contraparte: string;
  descripcion: string | null;
  monto_total: number;
  saldo: number;
  fecha: string;
  fecha_vencimiento: string | null;
  estado: string;
  proveedor_id: string | null;
};

const CATEGORIA_LABEL: Record<string, string> = {
  cliente: 'Cliente', empleado: 'Empleado', personal: 'Personal',
  proveedor: 'Proveedor', servicio: 'Servicio', otro: 'Otro',
};
const selectCls =
  'w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs';

/** Acciones por fila: abonar (modal con monto/nota + historial), editar (modal con
 *  formulario prellenado) y eliminar (confirmación). Las server actions redirigen
 *  y revalidan solas. */
export function DeudaRowActions({
  deuda,
  proveedores,
}: {
  deuda: DeudaFull;
  proveedores: { id: string; nombre: string }[];
}) {
  const [abonarOpen, setAbonarOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [borrarOpen, setBorrarOpen] = useState(false);
  const [abonos, setAbonos] = useState<Abono[] | null>(null);

  const abonado = Number(deuda.monto_total) - Number(deuda.saldo);

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
        onClick={() => setEditarOpen(true)}
        aria-label="Editar"
        title="Editar"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" />
      </button>
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

      <Modal open={editarOpen} onClose={() => setEditarOpen(false)} title={`Editar — ${deuda.contraparte}`}>
        <form action={editarDeuda} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={deuda.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`e-tipo-${deuda.id}`}>Tipo *</Label>
            <select id={`e-tipo-${deuda.id}`} name="tipo" required defaultValue={deuda.tipo} className={selectCls}>
              <option value="por_cobrar">Por cobrar (me deben)</option>
              <option value="por_pagar">Por pagar (yo debo)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`e-cat-${deuda.id}`}>Categoría *</Label>
            <select id={`e-cat-${deuda.id}`} name="categoria" required defaultValue={deuda.categoria} className={selectCls}>
              {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`e-cp-${deuda.id}`}>Nombre *</Label>
            <Input id={`e-cp-${deuda.id}`} name="contraparte" required defaultValue={deuda.contraparte} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`e-prov-${deuda.id}`}>Proveedor (si aplica)</Label>
            <select id={`e-prov-${deuda.id}`} name="proveedor_id" defaultValue={deuda.proveedor_id ?? ''} className={selectCls}>
              <option value="">— No aplica —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`e-desc-${deuda.id}`}>Descripción</Label>
            <Input id={`e-desc-${deuda.id}`} name="descripcion" defaultValue={deuda.descripcion ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`e-monto-${deuda.id}`}>Monto total *</Label>
            <Input id={`e-monto-${deuda.id}`} name="monto" type="number" min="1" required defaultValue={deuda.monto_total} />
            {abonado > 0 && (
              <p className="text-xs text-muted-foreground">
                Ya abonado: {clp.format(abonado)} — el monto no puede bajar de ahí.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`e-fecha-${deuda.id}`}>Fecha</Label>
              <Input id={`e-fecha-${deuda.id}`} name="fecha" type="date" defaultValue={deuda.fecha} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`e-venc-${deuda.id}`}>Vence</Label>
              <Input id={`e-venc-${deuda.id}`} name="fecha_vencimiento" type="date" defaultValue={deuda.fecha_vencimiento ?? ''} />
            </div>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditarOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </div>
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
