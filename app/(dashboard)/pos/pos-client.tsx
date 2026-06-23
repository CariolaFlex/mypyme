'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Nfc, ScanLine, ShoppingCart, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { BarcodeScannerModal } from '@/components/scanner/barcode-scanner-modal';
import { db, type ProductoCache } from '@/lib/db';
import { flushQueue, enviarVenta, contarPendientes } from '@/lib/sync';
import { imprimirBoleta, type BoletaData, type NegocioBoleta } from '@/lib/boleta';

type Metodo = { id: string; nombre: string; tipo: string | null };
type Categoria = { id: string; nombre: string };
type PagoRow = { key: string; metodoId: string };

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const qtyFmt = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 });

// Normaliza para búsqueda: minúsculas sin acentos.
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function PosClient({
  productos: productosIniciales,
  metodos,
  categorias,
  sesionCajaId,
  negocio,
  mpHabilitado = false,
}: {
  productos: ProductoCache[];
  metodos: Metodo[];
  categorias: Categoria[];
  sesionCajaId: string | null;
  negocio: NegocioBoleta;
  mpHabilitado?: boolean;
}) {
  const [productos, setProductos] = useState<ProductoCache[]>(productosIniciales);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState('');
  const [catId, setCatId] = useState<string | null>(null);
  // Multi-pago: una fila por método. Con 1 fila el monto es el total (y permite
  // vuelto en efectivo); con 2+ filas se reparte el total (montos explícitos).
  const [pagos, setPagos] = useState<PagoRow[]>([
    { key: 'p0', metodoId: metodos[0]?.id ?? '' },
  ]);
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [recibido, setRecibido] = useState('');
  const [online, setOnline] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [pending, startTransition] = useTransition();

  const refrescarPendientes = useCallback(async () => {
    setPendientes(await contarPendientes());
  }, []);

  const sincronizar = useCallback(async () => {
    const n = await flushQueue();
    if (n > 0) toast.success(`${n} venta(s) sincronizada(s)`);
    await refrescarPendientes();
  }, [refrescarPendientes]);

  // Cachear catálogo para uso offline + cargar de cache si no llegó del server.
  useEffect(() => {
    (async () => {
      if (productosIniciales.length) {
        await db.productos.clear();
        await db.productos.bulkPut(productosIniciales);
      } else {
        const cache = await db.productos.toArray();
        if (cache.length) setProductos(cache);
      }
      await refrescarPendientes();
      if (navigator.onLine) sincronizar();
    })();
  }, [productosIniciales, refrescarPendientes, sincronizar]);

  // Estado de conexión + sync al reconectar.
  useEffect(() => {
    // Sincroniza con el estado real del navegador (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const onUp = () => {
      setOnline(true);
      sincronizar();
    };
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, [sincronizar]);

  const productosById = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const items = Object.entries(cart).filter(([, qty]) => qty > 0);
  const total = items.reduce(
    (sum, [id, qty]) => sum + (productosById.get(id)?.precio_total ?? 0) * qty,
    0
  );

  // Catálogo filtrado por búsqueda + categoría.
  const productosFiltrados = useMemo(() => {
    const q = norm(busqueda.trim());
    return productos.filter(
      (p) =>
        (catId === null || p.categoria_id === catId) &&
        (q === '' || norm(p.nombre).includes(q))
    );
  }, [productos, busqueda, catId]);

  // Multi-pago.
  const multi = pagos.length > 1;
  const tipoDe = (id: string) => metodos.find((m) => m.id === id)?.tipo ?? null;
  const montoDe = (key: string) => Number(montos[key]) || 0;
  const sumaPagos = multi ? pagos.reduce((s, p) => s + montoDe(p.key), 0) : total;
  const resto = total - sumaPagos;

  // Vuelto en efectivo: solo en pago simple con método cash.
  const esEfectivoSimple = !multi && tipoDe(pagos[0]?.metodoId ?? '') === 'cash';
  const recibidoNum = Number(recibido) || 0;
  const vuelto = esEfectivoSimple && recibidoNum > total ? recibidoNum - total : 0;

  const pagosValidos =
    pagos.every((p) => p.metodoId) &&
    (!multi || (Math.abs(resto) < 1 && pagos.every((p) => montoDe(p.key) > 0)));

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  // ── Escáner de códigos en el POS ────────────────────────────────────────
  const [scanOpen, setScanOpen] = useState(false);
  const [continuo, setContinuo] = useState(false);
  // Carrito como bottom sheet en móvil (en desktop es panel lateral fijo).
  const [carritoOpen, setCarritoOpen] = useState(false);
  // Lookup por código de barras (en memoria → funciona offline).
  const productoByCode = useMemo(() => {
    const m = new Map<string, ProductoCache>();
    for (const p of productos) if (p.codigo_barras) m.set(p.codigo_barras.trim(), p);
    return m;
  }, [productos]);

  // ── Venta a granel / por peso ───────────────────────────────────────────
  const [granelId, setGranelId] = useState<string | null>(null);
  const [granelModo, setGranelModo] = useState<'peso' | 'monto'>('peso');
  const [granelInput, setGranelInput] = useState('');
  const granelProd = granelId ? productosById.get(granelId) : null;

  const abrirGranel = (id: string) => {
    setGranelId(id);
    setGranelModo('peso');
    setGranelInput(cart[id] ? String(cart[id]) : '');
  };
  // Al tocar un producto en la grilla: granel → modal de peso/monto; unitario → +1.
  const onTile = (p: ProductoCache) => (p.granel ? abrirGranel(p.id) : add(p.id));

  function onScan(code: string) {
    const p = productoByCode.get(code.trim());
    if (!p) {
      toast.error('Ese código no está en tu catálogo');
      return;
    }
    if (p.granel) {
      abrirGranel(p.id);
      if (!continuo) setScanOpen(false);
      return;
    }
    add(p.id);
    toast.success(`Agregado: ${p.nombre}`);
    if (!continuo) setScanOpen(false);
  }

  // Derivados del modal de granel: peso↔monto. process_sale recalcula el total
  // de línea (autoritativo) como precio_total × cantidad.
  const granelPrecioU = granelProd?.precio_total ?? 0;
  const granelVal = Number(granelInput) || 0;
  const granelCantidad =
    granelModo === 'peso'
      ? granelVal
      : granelPrecioU > 0
        ? Math.round((granelVal / granelPrecioU) * 1000) / 1000
        : 0;
  const granelTotal = Math.round(granelPrecioU * granelCantidad);
  const confirmarGranel = () => {
    if (!granelId || !(granelCantidad > 0)) return;
    setCart((c) => ({ ...c, [granelId]: granelCantidad }));
    setGranelId(null);
    setGranelInput('');
  };

  const agregarPago = () => {
    setPagos((prev) => {
      // Al pasar a multi, fija el monto de la primera fila al total actual.
      if (prev.length === 1) {
        setMontos((m) => ({ ...m, [prev[0].key]: m[prev[0].key] || String(total) }));
      }
      const usado = metodos.find((m) => !prev.some((p) => p.metodoId === m.id));
      const key = `p${Date.now()}`;
      setMontos((m) => ({ ...m, [key]: String(Math.max(resto, 0)) }));
      return [...prev, { key, metodoId: usado?.id ?? metodos[0]?.id ?? '' }];
    });
  };
  const quitarPago = (key: string) =>
    setPagos((prev) => (prev.length > 1 ? prev.filter((p) => p.key !== key) : prev));

  // ── Cobro con Mercado Pago Point (online-only) ──────────────────────────
  const [mpEsperando, setMpEsperando] = useState(false);
  const mpVentaRef = useRef<string | null>(null);
  const mpCancelRef = useRef(false);
  const mpSeleccionado = pagos.some((p) => tipoDe(p.metodoId) === 'mercadopago_point');

  // Deja el carrito y los pagos en limpio tras una venta.
  const limpiar = () => {
    setCart({});
    setRecibido('');
    setPagos([{ key: 'p0', metodoId: metodos[0]?.id ?? '' }]);
    setMontos({});
    setCarritoOpen(false);
  };

  // Poll de mp_cobros (RLS, browser client) hasta que el webhook resuelva el pago.
  const pollCobro = async (ventaId: string): Promise<string> => {
    const supabase = createClient();
    const MAX_INTENTOS = 72; // 72 × 2,5s ≈ 3 min
    for (let i = 0; i < MAX_INTENTOS; i++) {
      if (mpCancelRef.current) return 'canceled';
      const { data } = await supabase
        .from('mp_cobros')
        .select('estado')
        .eq('venta_id', ventaId)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();
      const estado = data?.estado;
      if (estado === 'approved' || estado === 'rejected' || estado === 'canceled') return estado;
      await new Promise((r) => setTimeout(r, 2500));
    }
    return 'timeout';
  };

  // Aborta el cobro en curso (best-effort: cancela el intent en MP).
  const cancelarMP = () => {
    mpCancelRef.current = true;
    const ventaId = mpVentaRef.current;
    if (ventaId) {
      fetch('/api/mp/cobro', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventaId }),
      }).catch(() => {});
    }
    setMpEsperando(false);
    mpVentaRef.current = null;
  };

  function onCobrar() {
    if (!items.length || !sesionCajaId || !pagosValidos) return;
    const usaMP = pagos.some((p) => tipoDe(p.metodoId) === 'mercadopago_point');
    if (usaMP && multi) {
      toast.error('El cobro con Mercado Pago no se puede dividir por ahora.');
      return;
    }
    if (usaMP && !navigator.onLine) {
      toast.error('El cobro con Mercado Pago necesita internet.');
      return;
    }
    if (usaMP && !mpHabilitado) {
      toast.error('Vincula tu terminal Point en Configuración → Mercado Pago.');
      return;
    }
    const pagosPayload = multi
      ? pagos.map((p) => {
          const monto = montoDe(p.key);
          return { metodo_pago_id: p.metodoId, monto, monto_recibido: monto };
        })
      : [
          {
            metodo_pago_id: pagos[0].metodoId,
            monto: total,
            monto_recibido: esEfectivoSimple && recibidoNum > 0 ? recibidoNum : total,
          },
        ];
    const payload = {
      ventaId: crypto.randomUUID(),
      sesionCajaId,
      lineas: items.map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
      pagos: pagosPayload,
    };
    const totalVenta = total;
    const vueltoVenta = vuelto;

    // Datos del comprobante imprimible (se arma en el cliente → sirve offline).
    const nombreMetodo = (id: string) => metodos.find((m) => m.id === id)?.nombre ?? 'Pago';
    const boletaData: BoletaData = {
      negocio,
      lineas: items.map(([id, cantidad]) => {
        const p = productosById.get(id)!;
        const precioUnit = p.precio_total ?? 0;
        return { nombre: p.nombre, cantidad, precioUnit, subtotal: precioUnit * cantidad };
      }),
      total: totalVenta,
      pagos: pagosPayload.map((p) => ({ nombre: nombreMetodo(p.metodo_pago_id), monto: p.monto })),
      vuelto: vueltoVenta,
      fecha: new Date(),
      ref: payload.ventaId.slice(0, 8).toUpperCase(),
    };
    const accionImprimir = {
      label: 'Imprimir boleta',
      onClick: () => imprimirBoleta(boletaData),
    };

    // Rama Mercado Pago Point: el cobro va a la maquinita; el webhook registra
    // la venta. El POS espera el resultado por poll.
    if (usaMP) {
      mpCancelRef.current = false;
      mpVentaRef.current = payload.ventaId;
      setMpEsperando(true);
      (async () => {
        try {
          const res = await fetch('/api/mp/cobro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ventaId: payload.ventaId,
              lineas: payload.lineas,
              pagos: payload.pagos,
              sesionCajaId: payload.sesionCajaId,
              total: totalVenta,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo iniciar el cobro');
          const estado = await pollCobro(payload.ventaId);
          if (estado === 'approved') {
            toast.success(`Venta registrada · ${clp.format(totalVenta)}`, {
              action: accionImprimir,
              duration: 8000,
            });
            limpiar();
          } else if (estado === 'rejected') {
            toast.error('El pago fue rechazado.');
          } else if (estado === 'canceled') {
            toast.error('El cobro se canceló.');
          } else {
            toast.error('No se confirmó el pago a tiempo. Revisa la maquinita.');
          }
        } catch (e) {
          toast.error((e as Error).message || 'No se pudo cobrar con Mercado Pago');
        } finally {
          setMpEsperando(false);
          mpVentaRef.current = null;
        }
      })();
      return;
    }

    startTransition(async () => {
      try {
        if (!navigator.onLine) throw new Error('offline');
        await enviarVenta(payload);
        toast.success(
          vueltoVenta > 0
            ? `Venta ${clp.format(totalVenta)} · Vuelto ${clp.format(vueltoVenta)}`
            : `Venta registrada · ${clp.format(totalVenta)}`,
          { action: accionImprimir, duration: 8000 }
        );
        limpiar();
      } catch (e) {
        if (!navigator.onLine || (e as Error).message === 'offline') {
          // Encolar para sincronizar luego.
          await db.ventasPendientes.add({
            ventaId: payload.ventaId,
            payload,
            total: totalVenta,
            creadoEn: Date.now(),
          });
          await refrescarPendientes();
          toast.success(`Venta guardada sin conexión · se sincronizará (${clp.format(totalVenta)})`, {
            action: accionImprimir,
            duration: 8000,
          });
          limpiar();
        } else {
          toast.error((e as Error).message || 'No se pudo cobrar');
        }
      }
    });
  }

  // Contenido del carrito reutilizado en el panel lateral (desktop) y en el
  // bottom sheet (móvil): la lista de ítems y el footer de cobro.
  const listaCarrito = items.length ? (
    <ul className="space-y-2">
      {items.map(([id, qty]) => {
        const p = productosById.get(id)!;
        return (
          <li key={id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex-1 truncate">{p.nombre}</span>
            {p.granel ? (
              <button
                type="button"
                onClick={() => abrirGranel(id)}
                className="rounded-md border px-2 py-1 text-xs tabular-nums hover:bg-muted"
              >
                {qtyFmt.format(qty)} {p.unidad_medida ?? ''} ✎
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon-sm" onClick={() => dec(id)}>
                  −
                </Button>
                <span className="w-6 text-center">{qty}</span>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => add(id)}>
                  +
                </Button>
              </div>
            )}
            <span className="w-20 text-right tabular-nums">
              {clp.format((p.precio_total ?? 0) * qty)}
            </span>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="py-10 text-center text-sm text-muted-foreground">
      Toca un producto para agregarlo.
    </p>
  );

  const footerCarrito = (
    <>
      <div className="flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span className="tabular-nums">{clp.format(total)}</span>
      </div>
      {/* Filas de pago (1 método o varios) */}
      <div className="space-y-2">
        {pagos.map((p) => (
          <div key={p.key} className="flex items-center gap-2">
            <select
              value={p.metodoId}
              onChange={(e) =>
                setPagos((prev) =>
                  prev.map((x) => (x.key === p.key ? { ...x, metodoId: e.target.value } : x))
                )
              }
              className="min-w-0 flex-1 rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
            >
              {metodos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            {multi && (
              <>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Monto"
                  value={montos[p.key] ?? ''}
                  onChange={(e) => setMontos((m) => ({ ...m, [p.key]: e.target.value }))}
                  className="w-24"
                />
                <Button type="button" variant="outline" size="icon-sm" onClick={() => quitarPago(p.key)}>
                  ×
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      {metodos.length > 1 && (
        <button
          type="button"
          onClick={agregarPago}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          + Agregar pago (dividir)
        </button>
      )}

      {multi && (
        <div
          className={`flex justify-between text-sm ${
            Math.abs(resto) < 1 ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          <span>{resto > 0 ? 'Falta' : resto < 0 ? 'Sobra' : 'Cuadrado'}</span>
          <span className="tabular-nums">{clp.format(Math.abs(resto))}</span>
        </div>
      )}

      {esEfectivoSimple && (
        <div className="space-y-1">
          <Input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="Efectivo recibido"
            value={recibido}
            onChange={(e) => setRecibido(e.target.value)}
          />
          {vuelto > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Vuelto</span>
              <span className="tabular-nums">{clp.format(vuelto)}</span>
            </div>
          )}
        </div>
      )}
      {mpSeleccionado && !online && (
        <p className="text-xs text-amber-600">
          El cobro con Mercado Pago necesita internet. El efectivo sigue funcionando sin conexión.
        </p>
      )}
      <Button
        type="button"
        size="lg"
        className="grad-brand-vivid w-full border-0 text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.01] disabled:opacity-50"
        disabled={
          !items.length ||
          pending ||
          mpEsperando ||
          !sesionCajaId ||
          !pagosValidos ||
          (mpSeleccionado && !online)
        }
        onClick={onCobrar}
      >
        {mpEsperando
          ? 'Esperando pago…'
          : pending
            ? 'Procesando…'
            : mpSeleccionado
              ? `Cobrar con MP ${clp.format(total)}`
              : `Cobrar ${clp.format(total)}`}
      </Button>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {!sesionCajaId ? (
          <div className="flex flex-1 items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
            <span>No hay caja abierta. Ábrela para poder cobrar.</span>
            <Link href="/caja">
              <Button size="sm">Ir a Caja</Button>
            </Link>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Caja abierta</div>
        )}
        <div className="flex items-center gap-2">
          {pendientes > 0 && <Badge variant="secondary">{pendientes} por sincronizar</Badge>}
          <Badge
            variant={online ? 'outline' : 'destructive'}
            className={online ? 'text-green-600' : ''}
          >
            {online ? '● En línea' : '● Sin conexión'}
          </Badge>
        </div>
      </div>

      <div className="md:grid md:h-[calc(100vh-8rem)] md:grid-cols-[1fr_20rem] md:gap-4">
        {/* Catálogo */}
        <div className="flex flex-col gap-3 pb-20 md:overflow-hidden md:pb-0">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Buscar producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => setScanOpen(true)}
            >
              <ScanLine className="size-4" /> Escanear
            </Button>
          </div>
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCatId(null)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  catId === null ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCatId(c.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    catId === c.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
          <div className="md:overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onTile(p)}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-3 text-center shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:shadow-xs"
                >
                  <span className="text-sm font-medium leading-tight">{p.nombre}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                    {clp.format(p.precio_total ?? 0)}
                    {p.granel ? `/${p.unidad_medida ?? 'u'}` : ''}
                  </span>
                </button>
              ))}
              {!productosFiltrados.length && (
                <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  {productos.length
                    ? 'Ningún producto coincide con el filtro.'
                    : 'No hay productos activos. Créalos en Productos.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Carrito — panel lateral (solo desktop ≥ md) */}
        <div className="hidden rounded-lg border bg-card md:flex md:flex-col">
          <div className="border-b p-3 font-medium">Carrito</div>
          <div className="flex-1 overflow-y-auto p-3">{listaCarrito}</div>
          <div className="space-y-3 border-t p-3">{footerCarrito}</div>
        </div>
      </div>

      {/* Móvil (< md): botón flotante con el total → abre el carrito como panel inferior */}
      <button
        type="button"
        onClick={() => setCarritoOpen(true)}
        className="grad-brand-vivid fixed inset-x-3 bottom-3 z-30 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-white shadow-lg shadow-primary/30 md:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShoppingCart className="size-4" />
          {items.length ? `${items.length} ítem(s)` : 'Carrito'}
        </span>
        <span className="text-sm font-bold tabular-nums">{clp.format(total)}</span>
      </button>

      {carritoOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCarritoOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Carrito"
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t bg-card shadow-xl duration-200 animate-in slide-in-from-bottom"
          >
            <div className="flex items-center justify-between border-b p-3">
              <span className="font-medium">Carrito{items.length ? ` · ${items.length}` : ''}</span>
              <button
                type="button"
                onClick={() => setCarritoOpen(false)}
                aria-label="Cerrar"
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{listaCarrito}</div>
            <div className="space-y-3 border-t p-3">{footerCarrito}</div>
          </div>
        </div>
      )}

      {/* Escáner de códigos → al carrito (offline, busca en el catálogo) */}
      <BarcodeScannerModal
        open={scanOpen}
        onScan={onScan}
        onClose={() => setScanOpen(false)}
        continuo={continuo}
        onToggleContinuo={setContinuo}
      />

      {/* Venta a granel: peso ↔ monto */}
      <Modal
        open={granelId !== null}
        onClose={() => setGranelId(null)}
        title={granelProd ? `Vender ${granelProd.nombre}` : 'Vender a granel'}
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Precio: <strong>{clp.format(granelPrecioU)}</strong> por {granelProd?.unidad_medida ?? 'unidad'}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['peso', 'monto'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setGranelModo(m)}
                className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                  granelModo === m
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-input bg-input/40 hover:bg-muted'
                }`}
              >
                {m === 'peso' ? 'Por peso' : 'Por monto $'}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="granel-input">
              {granelModo === 'peso' ? `Cantidad (${granelProd?.unidad_medida ?? 'unidad'})` : 'Monto en $'}
            </Label>
            <Input
              id="granel-input"
              type="number"
              min="0"
              step={granelModo === 'peso' ? '0.001' : '1'}
              inputMode="decimal"
              value={granelInput}
              onChange={(e) => setGranelInput(e.target.value)}
              autoFocus
            />
          </div>
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cantidad</span>
              <span className="tabular-nums">
                {qtyFmt.format(granelCantidad)} {granelProd?.unidad_medida ?? ''}
              </span>
            </div>
            <div className="mt-0.5 flex justify-between border-t pt-0.5 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{clp.format(granelTotal)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setGranelId(null)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={!(granelCantidad > 0)} onClick={confirmarGranel}>
              Agregar al carrito
            </Button>
          </div>
        </div>
      </Modal>

      {/* Esperando el pago en la maquinita Point */}
      <Modal open={mpEsperando} onClose={cancelarMP} title="Cobro con Mercado Pago">
        <div className="space-y-4 text-center">
          <Nfc className="mx-auto size-10 animate-pulse text-primary" />
          <p className="text-sm">
            Monto enviado a la maquinita: <strong>{clp.format(total)}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Pídele al cliente que pase o inserte la tarjeta en la terminal. La venta se registra sola al
            aprobarse el pago.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={cancelarMP}>
            Cancelar cobro
          </Button>
        </div>
      </Modal>
    </div>
  );
}
