'use client';

import { createElement, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Pencil, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Check, Settings2, ExternalLink,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  type AccesoRapido, iconoDe, colorDe, COLORES, NOMBRES_ICONO, DESTINOS_SUGERIDOS, esExterno,
} from '@/lib/accesos';
import { crearAcceso, editarAcceso, eliminarAcceso, reordenarAccesos } from '@/app/(dashboard)/inicio/accesos-actions';

type Borrador = { etiqueta: string; icono: string; destino: string; color: string };
const VACIO: Borrador = { etiqueta: '', icono: 'Zap', destino: '', color: 'blue' };

/**
 * Accesos rápidos del dashboard: grilla de botones que el usuario arma a su
 * gusto. Modo normal = navegar; modo edición (botón "Personalizar") = agregar,
 * editar, reordenar (flechas) y borrar. Cada acción llama a su server action y
 * refresca vía revalidatePath.
 */
export function AccesosRapidos({ inicial }: { inicial: AccesoRapido[] }) {
  const [items, setItems] = useState(inicial);
  const [editMode, setEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<AccesoRapido | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(VACIO);
  const [pending, startTransition] = useTransition();

  const abrirNuevo = () => {
    setEditando(null);
    setBorrador(VACIO);
    setModalOpen(true);
  };
  const abrirEditar = (a: AccesoRapido) => {
    setEditando(a);
    setBorrador({ etiqueta: a.etiqueta, icono: a.icono, destino: a.destino, color: a.color });
    setModalOpen(true);
  };

  function guardar() {
    startTransition(async () => {
      const res = editando
        ? await editarAcceso({ id: editando.id, ...borrador })
        : await crearAcceso(borrador);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      toast.success(editando ? 'Acceso actualizado' : 'Acceso creado');
      setModalOpen(false);
      // Optimista local para que se vea al instante (revalidatePath confirma).
      if (editando) {
        setItems((p) => p.map((x) => (x.id === editando.id ? { ...x, ...borrador } : x)));
      } else {
        setItems((p) => [...p, { id: `tmp-${Date.now()}`, orden: p.length, ...borrador }]);
      }
    });
  }

  function borrar(a: AccesoRapido) {
    startTransition(async () => {
      const res = await eliminarAcceso(a.id);
      if ('error' in res) {
        toast.error(res.error);
        return;
      }
      setItems((p) => p.filter((x) => x.id !== a.id));
      toast.success('Acceso eliminado');
    });
  }

  function mover(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    startTransition(async () => {
      await reordenarAccesos(next.map((x) => x.id));
    });
  }

  const sinAccesos = items.length === 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Accesos rápidos</h2>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
            editMode ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {editMode ? <Check className="size-3.5" /> : <Settings2 className="size-3.5" />}
          {editMode ? 'Listo' : 'Personalizar'}
        </button>
      </div>

      {sinAccesos && !editMode ? (
        <button
          type="button"
          onClick={() => { setEditMode(true); abrirNuevo(); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="size-4" /> Crea tu primer acceso rápido
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a, i) => {
            const Icono = iconoDe(a.icono);
            const c = colorDe(a.color);
            const externo = esExterno(a.destino);

            const cara = (
              <>
                <div className={cn('mb-2 inline-flex rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg', c.badge)}>
                  <Icono className="size-[18px]" />
                </div>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <span className="truncate">{a.etiqueta}</span>
                  {externo && <ExternalLink className="size-3 shrink-0 text-muted-foreground" />}
                </div>
              </>
            );

            const claseCard = cn(
              'group relative overflow-hidden rounded-2xl glass p-4 text-left shadow-sm ring-1 ring-transparent transition-all',
              !editMode && 'hover:-translate-y-0.5 hover:shadow-md',
              !editMode && c.ring
            );

            return (
              <div key={a.id} className={claseCard}>
                {editMode ? (
                  <div>
                    {cara}
                    <div className="mt-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => mover(i, -1)}
                        disabled={i === 0 || pending}
                        aria-label="Mover antes"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, 1)}
                        disabled={i === items.length - 1 || pending}
                        aria-label="Mover después"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEditar(a)}
                        aria-label="Editar"
                        className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => borrar(a)}
                        aria-label="Eliminar"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <GripVertical className="pointer-events-none absolute right-2 top-2 size-4 text-muted-foreground/30" />
                  </div>
                ) : externo ? (
                  <a href={a.destino} target="_blank" rel="noopener noreferrer" className="block">
                    {cara}
                  </a>
                ) : (
                  <Link href={a.destino} className="block">
                    {cara}
                  </Link>
                )}
              </div>
            );
          })}

          {/* Tarjeta "agregar" (solo en modo edición) */}
          {editMode && items.length < 12 && (
            <button
              type="button"
              onClick={abrirNuevo}
              className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-5" /> Agregar
            </button>
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar acceso' : 'Nuevo acceso rápido'}>
        <div className="space-y-4">
          {/* Vista previa en vivo */}
          <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
            <div className={cn('inline-flex rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg', colorDe(borrador.color).badge)}>
              {createElement(iconoDe(borrador.icono), { className: 'size-[18px]' })}
            </div>
            <span className="text-sm font-semibold">{borrador.etiqueta || 'Vista previa'}</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ar-etiqueta">Nombre *</Label>
            <Input
              id="ar-etiqueta"
              value={borrador.etiqueta}
              maxLength={40}
              onChange={(e) => setBorrador((b) => ({ ...b, etiqueta: e.target.value }))}
              placeholder="Ej. Vender rápido"
            />
          </div>

          {/* Destino: sugeridos + campo libre */}
          <div className="space-y-1.5">
            <Label htmlFor="ar-destino">Destino *</Label>
            <select
              id="ar-destino"
              value={DESTINOS_SUGERIDOS.some((d) => d.destino === borrador.destino) ? borrador.destino : '__url'}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__url') {
                  setBorrador((b) => ({ ...b, destino: '' }));
                } else {
                  const sug = DESTINOS_SUGERIDOS.find((d) => d.destino === v);
                  setBorrador((b) => ({ ...b, destino: v, icono: sug?.icono ?? b.icono }));
                }
              }}
              className="w-full rounded-md border border-input bg-input/50 px-2 py-2 text-sm shadow-xs"
            >
              {DESTINOS_SUGERIDOS.map((d) => (
                <option key={d.destino} value={d.destino}>{d.label}</option>
              ))}
              <option value="__url">Otra URL (externa)…</option>
            </select>
            {!DESTINOS_SUGERIDOS.some((d) => d.destino === borrador.destino) && (
              <Input
                value={borrador.destino}
                onChange={(e) => setBorrador((b) => ({ ...b, destino: e.target.value }))}
                placeholder="https://… o /ruta-interna"
                inputMode="url"
              />
            )}
          </div>

          {/* Ícono */}
          <div className="space-y-1.5">
            <Label>Ícono</Label>
            <div className="grid max-h-32 grid-cols-8 gap-1 overflow-y-auto rounded-md border p-2">
              {NOMBRES_ICONO.map((n) => {
                const P = iconoDe(n);
                const sel = borrador.icono === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setBorrador((b) => ({ ...b, icono: n }))}
                    aria-label={n}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md transition-colors',
                      sel ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <P className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLORES).map(([n, c]) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBorrador((b) => ({ ...b, color: n }))}
                  aria-label={c.label}
                  title={c.label}
                  className={cn(
                    'size-7 rounded-full bg-gradient-to-br ring-2 ring-offset-2 ring-offset-background transition-all',
                    c.badge,
                    borrador.color === n ? 'ring-foreground' : 'ring-transparent'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={pending} onClick={guardar}>
              {editando ? 'Guardar' : 'Crear acceso'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
