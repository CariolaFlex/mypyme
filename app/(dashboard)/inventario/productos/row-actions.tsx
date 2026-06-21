'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { CodigoConEscaner } from '@/components/scanner/codigo-con-escaner';
import { editarProducto, eliminarProducto, toggleActivo } from './actions';

const UNIDADES = ['unidad', 'g', 'kg', 'mg', 'ml', 'L', 'cc', 'oz', 'm', 'cm', 'pack', 'otro'];

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  codigo_barras: string | null;
  unidad_medida: string | null;
  categoria_id: string | null;
  precio_total: number | null;
  tasa_iva: number | null;
  stock_minimo: number | null;
  activo: boolean;
};

const selectCls = 'w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs';

export function ProductoRowActions({
  producto,
  categorias,
}: {
  producto: Producto;
  categorias: { id: string; nombre: string }[];
}) {
  const [editar, setEditar] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditar(true)}>
        Editar
      </Button>

      <form action={toggleActivo}>
        <input type="hidden" name="id" value={producto.id} />
        <input type="hidden" name="activo" value={String(producto.activo)} />
        <Button type="submit" variant="ghost" size="sm">
          {producto.activo ? 'Desactivar' : 'Activar'}
        </Button>
      </form>

      <form action={eliminarProducto}>
        <input type="hidden" name="id" value={producto.id} />
        <ConfirmSubmit
          title={`¿Eliminar «${producto.nombre}»?`}
          confirmLabel="Eliminar"
          className="text-destructive"
          message={
            <>
              Esta acción no se puede deshacer. Si el producto tiene ventas u órdenes asociadas, no
              podrás eliminarlo: desactívalo para ocultarlo sin perder el historial.
            </>
          }
        >
          Eliminar
        </ConfirmSubmit>
      </form>

      <Modal open={editar} onClose={() => setEditar(false)} title={`Editar «${producto.nombre}»`}>
        <form action={editarProducto} className="grid grid-cols-2 gap-3">
          <input type="hidden" name="id" value={producto.id} />
          <div className="space-y-1.5">
            <Label htmlFor={`sku-${producto.id}`}>SKU</Label>
            <Input id={`sku-${producto.id}`} name="sku" required defaultValue={producto.sku} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`nombre-${producto.id}`}>Nombre</Label>
            <Input id={`nombre-${producto.id}`} name="nombre" required defaultValue={producto.nombre} />
          </div>
          <div className="col-span-2">
            <CodigoConEscaner
              id={`codigo-${producto.id}`}
              defaultValue={producto.codigo_barras ?? ''}
              excludeId={producto.id}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`unidad-${producto.id}`}>Unidad de medida</Label>
            <select
              id={`unidad-${producto.id}`}
              name="unidad_medida"
              className={selectCls}
              defaultValue={producto.unidad_medida ?? 'unidad'}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor={`cat-${producto.id}`}>Categoría</Label>
            <select
              id={`cat-${producto.id}`}
              name="categoria_id"
              className={selectCls}
              defaultValue={producto.categoria_id ?? ''}
            >
              <option value="">— Sin categoría —</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`precio-${producto.id}`}>Precio (c/IVA)</Label>
            <Input
              id={`precio-${producto.id}`}
              name="precio_total"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={producto.precio_total ?? 0}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`iva-${producto.id}`}>IVA %</Label>
            <Input
              id={`iva-${producto.id}`}
              name="tasa_iva"
              type="number"
              min="0"
              step="0.01"
              defaultValue={producto.tasa_iva ?? 19}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor={`min-${producto.id}`}>Stock mínimo (opcional)</Label>
            <Input
              id={`min-${producto.id}`}
              name="stock_minimo"
              type="number"
              min="0"
              defaultValue={producto.stock_minimo ?? ''}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
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
