'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { editarProveedor, eliminarProveedor, toggleProveedor } from './actions';

type Proveedor = {
  id: string;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
};

export function ProveedorRowActions({ proveedor }: { proveedor: Proveedor }) {
  const [editar, setEditar] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditar(true)}>
        Editar
      </Button>

      <form action={toggleProveedor}>
        <input type="hidden" name="id" value={proveedor.id} />
        <input type="hidden" name="activo" value={String(proveedor.activo)} />
        <Button type="submit" variant="ghost" size="sm">
          {proveedor.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </form>

      <form action={eliminarProveedor}>
        <input type="hidden" name="id" value={proveedor.id} />
        <ConfirmSubmit
          title={`¿Eliminar «${proveedor.nombre}»?`}
          confirmLabel="Eliminar"
          className="text-destructive"
          message={
            <>
              Esta acción no se puede deshacer. Si el proveedor tiene gastos, órdenes o facturas
              asociadas, no podrás eliminarlo: desactívalo para ocultarlo sin perder el historial.
            </>
          }
        >
          Eliminar
        </ConfirmSubmit>
      </form>

      <Modal open={editar} onClose={() => setEditar(false)} title={`Editar «${proveedor.nombre}»`}>
        <form action={editarProveedor} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={proveedor.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`nombre-${proveedor.id}`}>Nombre *</Label>
            <Input id={`nombre-${proveedor.id}`} name="nombre" required defaultValue={proveedor.nombre} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`rut-${proveedor.id}`}>RUT</Label>
            <Input id={`rut-${proveedor.id}`} name="rut" defaultValue={proveedor.rut ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`email-${proveedor.id}`}>Email</Label>
            <Input id={`email-${proveedor.id}`} name="email" type="email" defaultValue={proveedor.email ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`tel-${proveedor.id}`}>Teléfono</Label>
            <Input id={`tel-${proveedor.id}`} name="telefono" defaultValue={proveedor.telefono ?? ''} />
          </div>
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
