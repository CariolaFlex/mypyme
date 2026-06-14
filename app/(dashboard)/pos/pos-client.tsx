'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { db, type ProductoCache } from '@/lib/db';
import { flushQueue, enviarVenta, contarPendientes } from '@/lib/sync';

type Metodo = { id: string; nombre: string; tipo: string | null };
type Categoria = { id: string; nombre: string };
type PagoRow = { key: string; metodoId: string };

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

// Normaliza para búsqueda: minúsculas sin acentos.
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function PosClient({
  productos: productosIniciales,
  metodos,
  categorias,
  sesionCajaId,
}: {
  productos: ProductoCache[];
  metodos: Metodo[];
  categorias: Categoria[];
  sesionCajaId: string | null;
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

  function onCobrar() {
    if (!items.length || !sesionCajaId || !pagosValidos) return;
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

    startTransition(async () => {
      const limpiar = () => {
        setCart({});
        setRecibido('');
        setPagos([{ key: 'p0', metodoId: metodos[0]?.id ?? '' }]);
        setMontos({});
      };
      try {
        if (!navigator.onLine) throw new Error('offline');
        await enviarVenta(payload);
        toast.success(
          vueltoVenta > 0
            ? `Venta ${clp.format(totalVenta)} · Vuelto ${clp.format(vueltoVenta)}`
            : `Venta registrada · ${clp.format(totalVenta)}`
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
          toast.success(`Venta guardada sin conexión · se sincronizará (${clp.format(totalVenta)})`);
          limpiar();
        } else {
          toast.error((e as Error).message || 'No se pudo cobrar');
        }
      }
    });
  }

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

      <div className="grid h-[calc(100vh-8rem)] grid-cols-[1fr_20rem] gap-4">
        {/* Catálogo */}
        <div className="flex flex-col gap-3 overflow-hidden">
          <Input
            placeholder="Buscar producto…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
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
          <div className="overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p.id)}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border bg-card p-3 text-center shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:translate-y-0 active:shadow-xs"
                >
                  <span className="text-sm font-medium leading-tight">{p.nombre}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                    {clp.format(p.precio_total ?? 0)}
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

        {/* Carrito */}
        <div className="flex flex-col rounded-lg border bg-card">
          <div className="border-b p-3 font-medium">Carrito</div>
          <div className="flex-1 overflow-y-auto p-3">
            {items.length ? (
              <ul className="space-y-2">
                {items.map(([id, qty]) => {
                  const p = productosById.get(id)!;
                  return (
                    <li key={id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex-1 truncate">{p.nombre}</span>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="icon-sm" onClick={() => dec(id)}>
                          −
                        </Button>
                        <span className="w-6 text-center">{qty}</span>
                        <Button type="button" variant="outline" size="icon-sm" onClick={() => add(id)}>
                          +
                        </Button>
                      </div>
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
            )}
          </div>
          <div className="space-y-3 border-t p-3">
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
                    className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs"
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
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!items.length || pending || !sesionCajaId || !pagosValidos}
              onClick={onCobrar}
            >
              {pending ? 'Procesando…' : `Cobrar ${clp.format(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
