'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Plus, Trash2, Check, FileText, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { runOCRInBrowser } from '@/lib/ocr/engine';
import { extraerFactura } from '@/lib/ocr/factura';
import type { FacturaExtraida, OCRProgress, TipoDocOCR } from '@/lib/ocr/types';
import { guardarScan, registrarFactura, cargarInventario } from './actions';

const VACIO: FacturaExtraida = {
  rut: '', razonSocial: '', folio: '', fecha: '', neto: 0, iva: 0, total: 0, items: [],
};
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const selectCls = 'w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs';
const TIPOS: { value: TipoDocOCR; label: string }[] = [
  { value: 'factura', label: 'Factura' },
  { value: 'boleta', label: 'Boleta' },
  { value: 'guia', label: 'Guía' },
  { value: 'otro', label: 'Otro' },
];

type Proveedor = { id: string; nombre: string; rut: string | null };
type Producto = { id: string; nombre: string };
const rutKey = (s: string | null | undefined) => (s ?? '').replace(/[.\-\s]/g, '').toUpperCase();

export function EscanearFactura({
  proveedores,
  productos,
}: {
  proveedores: Proveedor[];
  productos: Producto[];
}) {
  const router = useRouter();
  const [fase, setFase] = useState<'idle' | 'procesando' | 'review'>('idle');
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [d, setD] = useState<FacturaExtraida>(VACIO);
  const [meta, setMeta] = useState<{ textoPlano: string; confianza: number }>({ textoPlano: '', confianza: 0 });
  const [scanId, setScanId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [tipo, setTipo] = useState<TipoDocOCR>('factura');
  const [proveedorId, setProveedorId] = useState(''); // '' = crear nuevo
  const [vendedor, setVendedor] = useState('');
  // Mapeo ítem→destino de inventario, paralelo a d.items: '' = no cargar,
  // 'NEW' = crear producto, o el id de un producto existente.
  const [cargarSel, setCargarSel] = useState<string[]>([]);

  async function onFile(file: File) {
    setFase('procesando');
    setProgress({ step: 'loading', message: 'Preparando…', percent: 0 });
    try {
      const raw = await runOCRInBrowser(file, setProgress);
      const extra = extraerFactura(raw, tipo);
      setD(extra);
      setCargarSel(extra.items.map(() => ''));
      // Auto-vincular proveedor si el RUT escaneado coincide con uno existente.
      const k = rutKey(extra.rut);
      const match = k.length >= 7 ? proveedores.find((p) => rutKey(p.rut) === k) : undefined;
      setProveedorId(match?.id ?? '');
      setVendedor('');
      setMeta({ textoPlano: raw.fullText, confianza: raw.avgConfidence });
      setScanId(undefined);
      setFase('review');
    } catch {
      toast.error('No se pudo procesar la imagen. Prueba con una foto más nítida.');
      setFase('idle');
    }
  }

  const setCampo = <K extends keyof FacturaExtraida>(k: K, v: FacturaExtraida[K]) =>
    setD((p) => ({ ...p, [k]: v }));

  function setItem(i: number, campo: 'descripcion' | 'cantidad' | 'precio' | 'total', v: string) {
    setD((p) => {
      const items = [...p.items];
      items[i] = {
        ...items[i],
        [campo]: campo === 'descripcion' ? v : Number(v) || 0,
      };
      return { ...p, items };
    });
  }
  const addItem = () => {
    setD((p) => ({ ...p, items: [...p.items, { descripcion: '', cantidad: 1, precio: 0, total: 0 }] }));
    setCargarSel((s) => [...s, '']);
  };
  const delItem = (i: number) => {
    setD((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }));
    setCargarSel((s) => s.filter((_, j) => j !== i));
  };
  const setCargar = (i: number, v: string) => setCargarSel((s) => s.map((x, j) => (j === i ? v : x)));

  async function cargarAlInventario() {
    const rows = d.items
      .map((it, i) => ({ sel: cargarSel[i] ?? '', it }))
      .filter(({ sel, it }) => sel !== '' && it.cantidad > 0)
      .map(({ sel, it }) => ({
        productoId: sel === 'NEW' ? undefined : sel,
        crear: sel === 'NEW',
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio: it.precio,
      }));
    if (rows.length === 0) return toast.error('Elige a qué producto cargar al menos un ítem.');
    setBusy(true);
    const res = await cargarInventario({ rows });
    setBusy(false);
    if ('error' in res) return toast.error(res.error);
    if (res.errores.length)
      toast.warning(`Cargados ${res.cargados}. ${res.errores.length} con error: ${res.errores[0]}`);
    else toast.success(`${res.cargados} ítem(s) cargados al inventario.`);
  }

  async function guardarBorrador() {
    setBusy(true);
    const res = await guardarScan({ scanId, datos: d, textoPlano: meta.textoPlano, confianza: meta.confianza, estado: 'revisado' });
    setBusy(false);
    if ('error' in res) return toast.error(res.error);
    setScanId(res.id);
    toast.success('Borrador guardado.');
  }

  async function registrar() {
    setBusy(true);
    const res = await registrarFactura({
      scanId,
      datos: d,
      textoPlano: meta.textoPlano,
      confianza: meta.confianza,
      tipo,
      proveedorId: proveedorId || undefined,
      vendedor: vendedor.trim() || undefined,
    });
    setBusy(false);
    if ('error' in res) return toast.error(res.error);
    toast.success('Factura registrada en Cuentas por pagar.');
    router.push(`/compras/facturas/${res.facturaId}`);
  }

  // ── Idle: tipo de documento + instrucciones + subir/foto ────────────────
  if (fase === 'idle') {
    return (
      <div className="space-y-4">
        {/* 1) Tipo de documento (ajusta la extracción y el tipo tributario) */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">¿Qué vas a escanear?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  tipo === t.value
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-input bg-input/40 hover:bg-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2) Instrucciones de captura (mejoran mucho el resultado) */}
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Para que salga bien:</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Buena luz, sin sombras ni reflejos sobre el papel.</li>
            <li>Documento <strong>plano y derecho</strong>, que llene el encuadre.</li>
            <li>Que se vean nítidos el <strong>RUT</strong>, el <strong>N° de documento</strong> y el <strong>TOTAL</strong>.</li>
          </ul>
        </div>

        {/* 3) Cámara / subir */}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center hover:bg-muted/40">
          <Camera className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">Toca para sacar una foto o subir el documento</span>
          <span className="text-xs text-muted-foreground">Se lee en tu teléfono. La 1ª vez descarga ~8 MB de idioma.</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Los datos extraídos son una ayuda: <strong>revísalos y corrígelos</strong> antes de registrar.
        </p>
      </div>
    );
  }

  // ── Procesando ──────────────────────────────────────────────────────────
  if (fase === 'procesando') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border p-10">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm">{progress?.message ?? 'Procesando…'}</p>
        <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress?.percent ?? 0}%` }} />
        </div>
      </div>
    );
  }

  // ── Review / editar ─────────────────────────────────────────────────────
  // Validación de cuadre (se recalcula al editar): da confianza aunque el OCR
  // falle. Tolerancia de ±2 por redondeos.
  const sumaItems = d.items.reduce((a, it) => a + (Number(it.total) || 0), 0);
  const cuadraIva = d.total > 0 && Math.abs(d.neto + d.iva - d.total) <= 2;
  const cuadraItems = sumaItems > 0 && d.total > 0 && Math.abs(sumaItems - d.total) <= 2;
  const nCargar = cargarSel.filter((s) => s !== '').length;

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
        Revisa los datos: el OCR puede equivocarse. Confianza del reconocimiento:{' '}
        {Math.round(meta.confianza * 100)}%.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 rounded-lg border p-4">
        {/* Proveedor: elegir existente o crear nuevo (prerellenado del OCR) */}
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="prov-sel">Proveedor</Label>
          <select
            id="prov-sel"
            className={selectCls}
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
          >
            <option value="">+ Crear proveedor nuevo</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
                {p.rut ? ` · ${p.rut}` : ''}
              </option>
            ))}
          </select>
        </div>
        {proveedorId === '' && (
          <>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="prov">Razón social (nuevo proveedor)</Label>
              <Input id="prov" value={d.razonSocial} onChange={(e) => setCampo('razonSocial', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" value={d.rut} onChange={(e) => setCampo('rut', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendedor">Vendedor / contacto (opcional)</Label>
              <Input id="vendedor" value={vendedor} onChange={(e) => setVendedor(e.target.value)} />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="folio">N° factura</Label>
          <Input id="folio" value={d.folio} onChange={(e) => setCampo('folio', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" type="date" value={d.fecha} onChange={(e) => setCampo('fecha', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="total">Total (c/IVA)</Label>
          <Input id="total" type="number" min="0" value={d.total} onChange={(e) => setCampo('total', Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="neto">Neto</Label>
          <Input id="neto" type="number" min="0" value={d.neto} onChange={(e) => setCampo('neto', Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="iva">IVA</Label>
          <Input id="iva" type="number" min="0" value={d.iva} onChange={(e) => setCampo('iva', Number(e.target.value) || 0)} />
        </div>
      </div>

      {/* Ítems detectados (editable) */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium">Ítems detectados ({d.items.length})</span>
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
            <Plus className="size-4" /> Agregar
          </Button>
        </div>
        {d.items.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            No se detectaron ítems (común en facturas con tablas complejas). Puedes agregarlos a mano
            o registrar solo el total.
          </p>
        ) : (
          <div className="divide-y">
            {d.items.map((it, i) => (
              <div key={i} className="space-y-1.5 px-3 py-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                  <Input className="col-span-2 sm:col-span-5" placeholder="Descripción" value={it.descripcion} onChange={(e) => setItem(i, 'descripcion', e.target.value)} />
                  <Input className="col-span-1 sm:col-span-2" type="number" placeholder="Cant." value={it.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value)} />
                  <Input className="col-span-1 sm:col-span-2" type="number" placeholder="Precio" value={it.precio} onChange={(e) => setItem(i, 'precio', e.target.value)} />
                  <Input className="col-span-1 sm:col-span-2" type="number" placeholder="Total" value={it.total} onChange={(e) => setItem(i, 'total', e.target.value)} />
                  <button type="button" onClick={() => delItem(i)} aria-label="Quitar" className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {/* Destino de inventario (opcional, por fila) */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="shrink-0 text-muted-foreground">Cargar a:</span>
                  <select
                    className="min-w-0 flex-1 rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-1 text-xs shadow-xs"
                    value={cargarSel[i] ?? ''}
                    onChange={(e) => setCargar(i, e.target.value)}
                  >
                    <option value="">— No cargar al inventario —</option>
                    <option value="NEW">+ Crear producto nuevo (usa la descripción)</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cargar al inventario (opcional, según el destino elegido por fila) */}
      {nCargar > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">
            {nCargar} ítem(s) marcados para sumar stock en la bodega principal (costo = precio).
          </span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={cargarAlInventario} className="gap-2">
            <Boxes className="size-4" /> Cargar al inventario
          </Button>
        </div>
      )}

      {/* Cuadre (en vivo): ayuda a detectar errores del OCR antes de registrar */}
      {d.total > 0 && (
        <div className="space-y-1 text-xs">
          <p className={cuadraIva ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
            {cuadraIva ? '✓' : '⚠'} Neto + IVA = {clp.format(d.neto + d.iva)}
            {cuadraIva ? ' (cuadra con el total)' : ` — no coincide con el total ${clp.format(d.total)}`}
          </p>
          {sumaItems > 0 && (
            <p className={cuadraItems ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {cuadraItems ? '✓' : '⚠'} Suma de ítems = {clp.format(sumaItems)}
              {cuadraItems ? ' (cuadra con el total)' : ` — no coincide con el total ${clp.format(d.total)}`}
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-muted-foreground">Total a registrar: <strong>{clp.format(d.total)}</strong></p>

      {/* Texto reconocido (diagnóstico): permite ver qué leyó el OCR y reportarlo */}
      {meta.textoPlano && (
        <details className="rounded-lg border bg-muted/20 text-xs">
          <summary className="cursor-pointer px-3 py-2 text-muted-foreground">
            Ver texto reconocido (para reportar errores)
          </summary>
          <div className="space-y-2 border-t p-3">
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-muted-foreground">
              {meta.textoPlano}
            </pre>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(meta.textoPlano).then(
                  () => toast.success('Texto copiado'),
                  () => toast.error('No se pudo copiar')
                );
              }}
            >
              Copiar texto
            </Button>
          </div>
        </details>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => { setFase('idle'); setD(VACIO); setCargarSel([]); }}>
          Escanear otra
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={guardarBorrador} className="gap-2">
          <FileText className="size-4" /> Guardar borrador
        </Button>
        <Button type="button" disabled={busy} onClick={registrar} className="gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Registrar en Cuentas por pagar
        </Button>
      </div>
    </div>
  );
}
