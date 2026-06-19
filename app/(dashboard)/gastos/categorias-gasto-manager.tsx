'use client';

import { useState } from 'react';
import { Tags, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { crearCategoriaGasto, editarCategoriaGasto, eliminarCategoriaGasto } from './categorias-actions';

type Cat = { id: string; nombre: string };

function CatRow({ cat }: { cat: Cat }) {
  const [editar, setEditar] = useState(false);
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span>{cat.nombre}</span>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditar(true)}>
          Editar
        </Button>
        <form action={eliminarCategoriaGasto}>
          <input type="hidden" name="id" value={cat.id} />
          <ConfirmSubmit
            title={`¿Eliminar «${cat.nombre}»?`}
            confirmLabel="Eliminar"
            className="text-destructive"
            message={
              <>
                Si hay gastos con esta categoría, no podrás eliminarla; reasígnalos primero.
              </>
            }
          >
            Eliminar
          </ConfirmSubmit>
        </form>
      </div>

      <Modal open={editar} onClose={() => setEditar(false)} title={`Editar «${cat.nombre}»`}>
        <form action={editarCategoriaGasto} className="space-y-3">
          <input type="hidden" name="id" value={cat.id} />
          <Input name="nombre" required defaultValue={cat.nombre} aria-label="Nombre de la categoría" />
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

export function CategoriasGastoManager({ categorias }: { categorias: Cat[] }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="size-4" /> Categorías de gasto
        </CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Cerrar' : 'Gestionar'}
        </Button>
      </CardHeader>
      {abierto && (
        <CardContent className="space-y-3">
          <form action={crearCategoriaGasto} className="flex gap-2">
            <Input name="nombre" required placeholder="Nueva categoría (ej. Marketing)" />
            <Button type="submit" className="gap-1">
              <Plus className="size-4" /> Agregar
            </Button>
          </form>
          <div className="divide-y rounded-md border">
            {categorias.length ? (
              categorias.map((c) => <CatRow key={c.id} cat={c} />)
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Aún no hay categorías de gasto.
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
