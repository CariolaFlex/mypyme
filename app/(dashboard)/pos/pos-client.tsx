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

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export function PosClient({
  productos: productosIniciales,
  metodos,
  sesionCajaId,
}: {
  productos: ProductoCache[];
  metodos: Metodo[];
  sesionCajaId: string | null;
}) {
  const [productos, setProductos] = useState<ProductoCache[]>(productosIniciales);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [metodoId, setMetodoId] = useState(metodos[0]?.id ?? '');
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

  const metodo = metodos.find((m) => m.id === metodoId);
  const esEfectivo = metodo?.tipo === 'cash';
  const recibidoNum = Number(recibido) || 0;
  const vuelto = esEfectivo && recibidoNum > total ? recibidoNum - total : 0;

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) - 1) }));

  function onCobrar() {
    if (!items.length || !sesionCajaId) return;
    const montoRecibido = esEfectivo && recibidoNum > 0 ? recibidoNum : total;
    const payload = {
      ventaId: crypto.randomUUID(),
      sesionCajaId,
      lineas: items.map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
      pagos: metodoId
        ? [{ metodo_pago_id: metodoId, monto: total, monto_recibido: montoRecibido }]
        : [],
    };
    const totalVenta = total;
    const vueltoVenta = vuelto;

    startTransition(async () => {
      const limpiar = () => {
        setCart({});
        setRecibido('');
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
        <div className="overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {productos.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border bg-card p-3 text-center transition-colors hover:bg-muted active:translate-y-px"
              >
                <span className="text-sm font-medium leading-tight">{p.nombre}</span>
                <span className="text-xs text-muted-foreground">{clp.format(p.precio_total ?? 0)}</span>
              </button>
            ))}
            {!productos.length && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                No hay productos activos. Créalos en Productos.
              </p>
            )}
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
            <select
              value={metodoId}
              onChange={(e) => setMetodoId(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs"
            >
              {metodos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            {esEfectivo && (
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
              disabled={!items.length || pending || !sesionCajaId}
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
