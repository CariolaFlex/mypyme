'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cobrar } from './actions';

type Producto = { id: string; nombre: string; precio_total: number | null };
type Metodo = { id: string; nombre: string; tipo: string | null };

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

export function PosClient({
  productos,
  metodos,
  sesionCajaId,
}: {
  productos: Producto[];
  metodos: Metodo[];
  sesionCajaId: string | null;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [metodoId, setMetodoId] = useState(metodos[0]?.id ?? '');
  const [recibido, setRecibido] = useState('');
  const [pending, startTransition] = useTransition();

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
    startTransition(async () => {
      const res = await cobrar(payload);
      if (res.ok) {
        toast.success(
          vuelto > 0
            ? `Venta ${clp.format(total)} · Vuelto ${clp.format(vuelto)}`
            : `Venta registrada · ${clp.format(total)}`
        );
        setCart({});
        setRecibido('');
      } else {
        toast.error(res.error ?? 'No se pudo cobrar');
      }
    });
  }

  return (
    <div className="space-y-3">
      {!sesionCajaId && (
        <div className="flex items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm">
          <span>No hay caja abierta. Ábrela para poder cobrar.</span>
          <Link href="/caja">
            <Button size="sm">Ir a Caja</Button>
          </Link>
        </div>
      )}

      <div className="grid h-[calc(100vh-7rem)] grid-cols-[1fr_20rem] gap-4">
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
              {pending ? 'Cobrando…' : `Cobrar ${clp.format(total)}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
