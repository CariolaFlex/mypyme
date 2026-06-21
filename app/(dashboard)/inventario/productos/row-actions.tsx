'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { ConfirmSubmit } from '@/components/confirm-submit';
import { CodigoConEscaner } from '@/components/scanner/codigo-con-escaner';
import { editarProducto, eliminarProducto, toggleActivo, crearCategoriaRapida } from './actions';

const UNIDADES = ['unidad', 'g', 'kg', 'mg', 'ml', 'L', 'cc', 'oz', 'm', 'cm', 'pack', 'otro'];

type Producto = {
  id: string;
  sku: string;
  nombre: string;
  codigo_barras: string | null;
  unidad_medida: string | null;
  contenido: number | null;
  categoria_id: string | null;
  precio_total: number | null;
  tasa_iva: number | null;
  stock_minimo: number | null;
  activo: boolean;
};

type Cat = { id: string; nombre: string };

const selectCls = 'w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs';

export function ProductoRowActions({
  producto,
  categorias: categoriasIniciales,
  tasaDefault,
}: {
  producto: Producto;
  categorias: Cat[];
  tasaDefault: number;
}) {
  const [editar, setEditar] = useState(false);
  const [categorias, setCategorias] = useState<Cat[]>(categoriasIniciales);
  const [categoriaId, setCategoriaId] = useState(producto.categoria_id ?? '');

  // Modo IVA derivado de la tasa guardada (0 = exento, default del negocio = afecto, otro = personalizado).
  const tasaActual = producto.tasa_iva ?? tasaDefault;
  const modoInicial: 'afecto' | 'exento' | 'custom' =
    tasaActual === 0 ? 'exento' : tasaActual === tasaDefault ? 'afecto' : 'custom';
  const [ivaMode, setIvaMode] = useState<'afecto' | 'exento' | 'custom'>(modoInicial);
  const [tasaCustom, setTasaCustom] = useState(String(tasaActual));
  const tasaEfectiva = ivaMode === 'exento' ? 0 : ivaMode === 'afecto' ? tasaDefault : Number(tasaCustom) || 0;

  // Crear categoría inline (sin salir del modal).
  const [catModal, setCatModal] = useState(false);
  const [catNombre, setCatNombre] = useState('');
  const [catBusy, setCatBusy] = useState(false);

  async function crearCat() {
    setCatBusy(true);
    const res = await crearCategoriaRapida(catNombre);
    setCatBusy(false);
    if ('error' in res) return toast.error(res.error);
    setCategorias((prev) =>
      [...prev, { id: res.id, nombre: res.nombre }].sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
    setCategoriaId(res.id);
    setCatNombre('');
    setCatModal(false);
    toast.success(`Categoría «${res.nombre}» creada`);
  }

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
        <form action={editarProducto} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={producto.id} />
          <input type="hidden" name="tasa_iva" value={tasaEfectiva} />
          <input type="hidden" name="categoria_id" value={categoriaId} />
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

          {/* Categoría + crear inline */}
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor={`cat-${producto.id}`}>Categoría</Label>
            <div className="flex gap-2">
              <select
                id={`cat-${producto.id}`}
                className={selectCls}
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">— Sin categoría —</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCatModal(true)}
                className="flex shrink-0 items-center gap-1 rounded-md border border-input px-2 text-sm text-muted-foreground shadow-xs hover:bg-muted"
              >
                <Plus className="size-4" /> Nueva
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`unidad-${producto.id}`}>Contenido y unidad</Label>
            <div className="flex gap-2">
              <Input
                id={`contenido-${producto.id}`}
                name="contenido"
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                placeholder="Ej: 1.5"
                className="w-24"
                defaultValue={producto.contenido ?? ''}
              />
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
          </div>

          {/* IVA: Afecto / Exento / Personalizado */}
          <div className="space-y-1.5">
            <Label htmlFor={`iva-${producto.id}`}>IVA</Label>
            <select
              id={`iva-${producto.id}`}
              className={selectCls}
              value={ivaMode}
              onChange={(e) => setIvaMode(e.target.value as typeof ivaMode)}
            >
              <option value="afecto">Afecto ({tasaDefault}%)</option>
              <option value="exento">Exento (0%)</option>
              <option value="custom">Personalizado…</option>
            </select>
            {ivaMode === 'custom' && (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tasaCustom}
                onChange={(e) => setTasaCustom(e.target.value)}
                placeholder="Tasa IVA %"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`precio-${producto.id}`}>
              {ivaMode === 'exento' ? 'Precio (sin IVA)' : 'Precio (c/IVA)'}
            </Label>
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

        {/* Modal anidado: crear categoría */}
        <Modal open={catModal} onClose={() => setCatModal(false)} title="Nueva categoría">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`cat-nombre-${producto.id}`}>Nombre</Label>
              <Input
                id={`cat-nombre-${producto.id}`}
                value={catNombre}
                onChange={(e) => setCatNombre(e.target.value)}
                placeholder="Ej: Bebidas"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCatModal(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={catBusy} onClick={crearCat}>
                {catBusy ? 'Creando…' : 'Crear'}
              </Button>
            </div>
          </div>
        </Modal>
      </Modal>
    </div>
  );
}
