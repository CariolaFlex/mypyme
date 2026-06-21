'use client';

import { useEffect, useState } from 'react';
import { Plus, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { CodigoConEscaner } from '@/components/scanner/codigo-con-escaner';
import { ImagenProducto } from './imagen-producto';
import { buscarPorCodigo } from '@/lib/openfoodfacts';
import { crearProducto, crearCategoriaRapida } from './actions';

const selectCls =
  'w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs';

const UNIDADES = ['unidad', 'g', 'kg', 'mg', 'ml', 'L', 'cc', 'oz', 'm', 'cm', 'pack', 'otro'];
const PRESENTACIONES = ['Pack', 'Six-pack', 'Docena', 'Caja', 'Manga', 'Otro'];
const STORAGE_KEY = 'borrador-producto';

type Cat = { id: string; nombre: string };

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export function ProductoForm({
  categorias: categoriasIniciales,
  tasaDefault,
  clearDraft,
}: {
  categorias: Cat[];
  tasaDefault: number;
  clearDraft: boolean;
}) {
  const [categorias, setCategorias] = useState<Cat[]>(categoriasIniciales);

  const vacio = {
    sku: '',
    nombre: '',
    codigo_barras: '',
    categoria_id: '',
    unidad_medida: 'unidad',
    ivaMode: 'afecto' as 'afecto' | 'exento' | 'custom',
    tasa_iva: String(tasaDefault),
    precio_total: '',
    stock_inicial: '',
    stock_minimo: '',
    imagen_url: '',
  };
  // ── Autosave de borrador (sessionStorage) ───────────────────────────────
  // Restaura con lazy-init (no effect → no choca con react-hooks/set-state-in-effect).
  // Tras un alta exitosa (?ok) parte vacío; en error la página recarga con ?error
  // y el borrador guardado repuebla el form con lo que el usuario había escrito.
  const [f, setF] = useState<typeof vacio>(() => {
    if (typeof window === 'undefined' || clearDraft) return vacio;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? { ...vacio, ...JSON.parse(raw) } : vacio;
    } catch {
      return vacio;
    }
  });
  const set = <K extends keyof typeof vacio>(k: K, v: (typeof vacio)[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    try {
      if (clearDraft) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(f));
    } catch {
      /* cuota llena / borrador corrupto: ignorar */
    }
  }, [f, clearDraft]);

  // ── IVA efectivo según el modo ──────────────────────────────────────────
  const tasaEfectiva =
    f.ivaMode === 'exento' ? 0 : f.ivaMode === 'afecto' ? tasaDefault : Number(f.tasa_iva) || 0;

  // ── Calculadora de presentación / lotes ─────────────────────────────────
  const [loteOpen, setLoteOpen] = useState(false);
  const [lote, setLote] = useState({ tipo: 'Pack', unidades: '', precioPack: '' });
  const unidadesPack = Number(lote.unidades) || 0;
  const precioPack = Number(lote.precioPack) || 0;
  const costoUnitario = unidadesPack > 0 ? precioPack / unidadesPack : null;
  const precioVenta = Number(f.precio_total) || 0;
  const margen =
    costoUnitario && costoUnitario > 0 && precioVenta > 0
      ? ((precioVenta - costoUnitario) / costoUnitario) * 100
      : null;

  // ── Crear categoría inline ──────────────────────────────────────────────
  const [catModal, setCatModal] = useState(false);
  const [catNombre, setCatNombre] = useState('');
  const [catBusy, setCatBusy] = useState(false);

  async function crearCat() {
    setCatBusy(true);
    const res = await crearCategoriaRapida(catNombre);
    setCatBusy(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    setCategorias((prev) =>
      [...prev, { id: res.id, nombre: res.nombre }].sort((a, b) => a.nombre.localeCompare(b.nombre))
    );
    set('categoria_id', res.id);
    setCatNombre('');
    setCatModal(false);
    toast.success(`Categoría «${res.nombre}» creada`);
  }

  // ── Enriquecimiento al escanear (Open Food Facts) ───────────────────────
  // Best-effort: prerellena nombre/unidad SOLO si están vacíos (no pisa lo tipeado).
  async function enriquecer(code: string) {
    const p = await buscarPorCodigo(code);
    if (!p) return;
    setF((prev) => {
      const sugerido =
        p.marca && p.nombre && !p.nombre.toLowerCase().includes(p.marca.toLowerCase())
          ? `${p.marca} ${p.nombre}`
          : (p.nombre ?? p.marca ?? '');
      return {
        ...prev,
        nombre: prev.nombre.trim() ? prev.nombre : sugerido,
        unidad_medida: prev.unidad_medida === 'unidad' && p.unidad ? p.unidad : prev.unidad_medida,
        imagen_url: prev.imagen_url || p.imagen || '',
      };
    });
    toast.success(`Datos encontrados: ${p.nombre ?? p.marca}`);
  }

  return (
    <form action={crearProducto} className="grid grid-cols-2 gap-3 rounded-lg border p-4">
      {/* Valores efectivos / ocultos */}
      <input type="hidden" name="tasa_iva" value={tasaEfectiva} />

      <div className="space-y-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" required value={f.sku} onChange={(e) => set('sku', e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
      </div>

      <div className="col-span-2">
        <CodigoConEscaner
          value={f.codigo_barras}
          onValueChange={(v) => set('codigo_barras', v)}
          onScanned={enriquecer}
        />
      </div>

      {/* Categoría + crear inline */}
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="categoria_id">Categoría</Label>
        <div className="flex gap-2">
          <select
            id="categoria_id"
            name="categoria_id"
            className={selectCls}
            value={f.categoria_id}
            onChange={(e) => set('categoria_id', e.target.value)}
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

      {/* Unidad de medida */}
      <div className="space-y-1.5">
        <Label htmlFor="unidad_medida">Unidad de medida</Label>
        <select
          id="unidad_medida"
          name="unidad_medida"
          className={selectCls}
          value={f.unidad_medida}
          onChange={(e) => set('unidad_medida', e.target.value)}
        >
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      {/* IVA: Exento / 19% / Personalizado */}
      <div className="space-y-1.5">
        <Label htmlFor="ivaMode">IVA</Label>
        <select
          id="ivaMode"
          className={selectCls}
          value={f.ivaMode}
          onChange={(e) => set('ivaMode', e.target.value as typeof f.ivaMode)}
        >
          <option value="afecto">Afecto ({tasaDefault}%)</option>
          <option value="exento">Exento (0%)</option>
          <option value="custom">Personalizado…</option>
        </select>
        {f.ivaMode === 'custom' && (
          <Input
            type="number"
            min="0"
            step="0.01"
            value={f.tasa_iva}
            onChange={(e) => set('tasa_iva', e.target.value)}
            placeholder="Tasa IVA %"
          />
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="precio_total">
          {f.ivaMode === 'exento' ? 'Precio (sin IVA)' : 'Precio (c/IVA)'}
        </Label>
        <Input
          id="precio_total"
          name="precio_total"
          type="number"
          min="0"
          step="1"
          required
          value={f.precio_total}
          onChange={(e) => set('precio_total', e.target.value)}
        />
      </div>

      <ImagenProducto value={f.imagen_url} onChange={(v) => set('imagen_url', v)} />

      {/* Presentación comercial / lotes (calculadora, no se guarda) */}
      <div className="col-span-2 rounded-md border bg-muted/20">
        <button
          type="button"
          onClick={() => setLoteOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
        >
          <Boxes className="size-4 text-muted-foreground" />
          Presentación comercial / lotes
          <span className="ml-auto text-xs text-muted-foreground">{loteOpen ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {loteOpen && (
          <div className="space-y-3 border-t p-3">
            <p className="text-xs text-muted-foreground">
              Si compras por pack (ej. «Confort 12 mangas»), calcula el costo por unidad y tu margen.
              Esto NO se guarda: solo te ayuda a fijar el precio de venta de arriba.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="lote-tipo">Tipo</Label>
                <select
                  id="lote-tipo"
                  className={selectCls}
                  value={lote.tipo}
                  onChange={(e) => setLote((l) => ({ ...l, tipo: e.target.value }))}
                >
                  {PRESENTACIONES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lote-unidades">Unidades por {lote.tipo.toLowerCase()}</Label>
                <Input
                  id="lote-unidades"
                  type="number"
                  min="0"
                  step="1"
                  value={lote.unidades}
                  onChange={(e) => setLote((l) => ({ ...l, unidades: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lote-precio">Precio del {lote.tipo.toLowerCase()} (c/IVA)</Label>
                <Input
                  id="lote-precio"
                  type="number"
                  min="0"
                  step="1"
                  value={lote.precioPack}
                  onChange={(e) => setLote((l) => ({ ...l, precioPack: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                Costo unitario:{' '}
                <strong>{costoUnitario != null ? clp.format(Math.round(costoUnitario)) : '—'}</strong>
              </span>
              <span>
                Margen:{' '}
                <strong className={margen != null ? (margen >= 0 ? 'text-emerald-600' : 'text-destructive') : ''}>
                  {margen != null ? `${margen.toFixed(1)}%` : '—'}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stock inicial + alerta de mínimo (último, opcional) */}
      <div className="space-y-1.5">
        <Label htmlFor="stock_inicial">Stock inicial (opcional)</Label>
        <Input
          id="stock_inicial"
          name="stock_inicial"
          type="number"
          min="0"
          value={f.stock_inicial}
          onChange={(e) => set('stock_inicial', e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="stock_minimo">Alerta de stock mínimo (opcional)</Label>
        <Input
          id="stock_minimo"
          name="stock_minimo"
          type="number"
          min="0"
          value={f.stock_minimo}
          onChange={(e) => set('stock_minimo', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Te avisaremos cuando el stock caiga por debajo de esta cantidad.
        </p>
      </div>

      <div className="col-span-2">
        <Button type="submit">Agregar producto</Button>
      </div>

      {/* Modal: crear categoría sin salir del formulario */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nueva categoría">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-nombre">Nombre</Label>
            <Input
              id="cat-nombre"
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
    </form>
  );
}
