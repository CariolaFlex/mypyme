'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { editarMetodo, eliminarMetodo, toggleMetodo } from './actions';

type Metodo = { id: string; nombre: string; tipo: string | null; activo: boolean };

const selectCls = 'w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs';

export function MetodoRowActions({ metodo }: { metodo: Metodo }) {
  const [editar, setEditar] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditar(true)}>
        Editar
      </Button>

      <form action={toggleMetodo}>
        <input type="hidden" name="id" value={metodo.id} />
        <input type="hidden" name="activo" value={String(metodo.activo)} />
        <Button type="submit" variant="ghost" size="sm">
          {metodo.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </form>

      <form action={eliminarMetodo}>
        <input type="hidden" name="id" value={metodo.id} />
        <ConfirmSubmit
          title={`¿Eliminar «${metodo.nombre}»?`}
          confirmLabel="Eliminar"
          className="text-destructive"
          message={
            <>
              Si el método se usó en ventas o pagos, no podrás eliminarlo: desactívalo para que no
              aparezca en el POS sin perder el historial.
            </>
          }
        >
          Eliminar
        </ConfirmSubmit>
      </form>

      <Modal open={editar} onClose={() => setEditar(false)} title={`Editar «${metodo.nombre}»`}>
        <form action={editarMetodo} className="space-y-3">
          <input type="hidden" name="id" value={metodo.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`nombre-${metodo.id}`}>Nombre</Label>
            <Input id={`nombre-${metodo.id}`} name="nombre" required defaultValue={metodo.nombre} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`tipo-${metodo.id}`}>Tipo</Label>
            <select id={`tipo-${metodo.id}`} name="tipo" className={selectCls} defaultValue={metodo.tipo ?? 'other'}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditar(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
