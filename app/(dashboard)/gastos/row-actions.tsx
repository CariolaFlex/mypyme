'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { DocTributario } from '@/components/doc-tributario';
import { editarGasto, eliminarGasto } from './actions';

type Gasto = {
  id: string;
  categoria_gasto_id: string | null;
  proveedor_id: string | null;
  descripcion: string;
  fecha: string;
  monto_total: number;
  tasa_iva: number;
  sesion_caja_id: string | null;
  tipo_documento: string;
};
type Opcion = { id: string; nombre: string };

const selectCls = 'w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs';

export function GastoRowActions({
  gasto,
  categorias,
  proveedores,
}: {
  gasto: Gasto;
  categorias: Opcion[];
  proveedores: Opcion[];
}) {
  const [editar, setEditar] = useState(false);
  const cajaLinked = !!gasto.sesion_caja_id;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditar(true)}>
        Editar
      </Button>

      <form action={eliminarGasto}>
        <input type="hidden" name="id" value={gasto.id} />
        <ConfirmSubmit
          title="¿Eliminar gasto?"
          confirmLabel="Eliminar"
          className="text-destructive"
          message={
            cajaLinked ? (
              <>Este gasto se pagó en efectivo y afecta la caja; no se podrá eliminar para no descuadrarla.</>
            ) : (
              <>Esta acción no se puede deshacer.</>
            )
          }
        >
          Eliminar
        </ConfirmSubmit>
      </form>

      <Modal open={editar} onClose={() => setEditar(false)} title="Editar gasto">
        <form action={editarGasto} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={gasto.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`cat-${gasto.id}`}>Categoría *</Label>
            <select
              id={`cat-${gasto.id}`}
              name="categoria_gasto_id"
              required
              className={selectCls}
              defaultValue={gasto.categoria_gasto_id ?? ''}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`prov-${gasto.id}`}>Proveedor</Label>
            <select
              id={`prov-${gasto.id}`}
              name="proveedor_id"
              className={selectCls}
              defaultValue={gasto.proveedor_id ?? ''}
            >
              <option value="">— Sin proveedor —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`desc-${gasto.id}`}>Descripción *</Label>
            <Input id={`desc-${gasto.id}`} name="descripcion" required defaultValue={gasto.descripcion} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`fecha-${gasto.id}`}>Fecha</Label>
            <Input id={`fecha-${gasto.id}`} name="fecha" type="date" defaultValue={gasto.fecha} />
          </div>
          {!cajaLinked ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`monto-${gasto.id}`}>Monto total (con IVA) *</Label>
                <Input
                  id={`monto-${gasto.id}`}
                  name="monto_total"
                  type="number"
                  min="1"
                  required
                  defaultValue={gasto.monto_total}
                />
              </div>
              <DocTributario
                idPrefix={`ge-${gasto.id}-`}
                defaultTipo={gasto.tipo_documento}
                defaultTasa={gasto.tasa_iva}
              />
            </>
          ) : (
            <p className="sm:col-span-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
              Este gasto se pagó en efectivo (afecta la caja). Puedes corregir los datos, pero no el
              monto. Para cambiar el monto, elimínalo con la caja abierta y regístralo de nuevo.
            </p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditar(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
