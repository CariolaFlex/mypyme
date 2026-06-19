'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { editarCategoria, eliminarCategoria } from './actions';

export function CategoriaRowActions({
  categoria,
  productos,
}: {
  categoria: { id: string; nombre: string };
  productos: number;
}) {
  const [editar, setEditar] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditar(true)}>
        Editar
      </Button>

      <form action={eliminarCategoria}>
        <input type="hidden" name="id" value={categoria.id} />
        <ConfirmSubmit
          title={`¿Eliminar «${categoria.nombre}»?`}
          confirmLabel="Eliminar"
          className="text-destructive"
          message={
            productos > 0 ? (
              <>
                {productos} producto{productos === 1 ? '' : 's'} quedará
                {productos === 1 ? '' : 'n'} sin categoría (no se elimina{productos === 1 ? '' : 'n'} ni se
                pierde el historial). ¿Continuar?
              </>
            ) : (
              <>Esta acción no se puede deshacer.</>
            )
          }
        >
          Eliminar
        </ConfirmSubmit>
      </form>

      <Modal open={editar} onClose={() => setEditar(false)} title={`Editar «${categoria.nombre}»`}>
        <form action={editarCategoria} className="space-y-3">
          <input type="hidden" name="id" value={categoria.id} />
          <Input name="nombre" required defaultValue={categoria.nombre} aria-label="Nombre de la categoría" />
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
