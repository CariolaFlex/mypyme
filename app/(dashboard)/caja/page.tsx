import { Wallet } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { abrirCaja, cerrarCaja, registrarMovimientoCaja } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const dynamic = 'force-dynamic';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const fmtFecha = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const TIPO_MOV: Record<string, string> = {
  venta: 'Venta',
  entrada_manual: 'Entrada',
  salida_manual: 'Salida',
  gasto: 'Gasto',
  pago_proveedor: 'Pago prov.',
};
const tipoMov = (t: string) => TIPO_MOV[t] ?? t;

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: abierta } = await supabase
    .from('sesiones_caja')
    .select('id, abierta_en, monto_apertura, cajas(nombre)')
    .eq('estado', 'abierta')
    .maybeSingle();

  // Efectivo acumulado de la sesión abierta (para mostrar el esperado en vivo).
  let esperado: number | null = null;
  type Movimiento = { tipo: string; monto: number; descripcion: string | null; ocurrido_en: string };
  let movimientos: Movimiento[] = [];
  if (abierta) {
    const { data: movs } = await supabase
      .from('movimientos_caja')
      .select('tipo, monto, descripcion, ocurrido_en')
      .eq('sesion_caja_id', abierta.id)
      .order('ocurrido_en', { ascending: false });
    movimientos = (movs as Movimiento[] | null) ?? [];
    esperado =
      Number(abierta.monto_apertura) +
      movimientos.reduce((s, m) => s + Number(m.monto), 0);
  }

  const { data: sesiones } = await supabase
    .from('sesiones_caja')
    .select('id, estado, abierta_en, cerrada_en, monto_apertura, monto_cierre, monto_esperado')
    .order('abierta_en', { ascending: false })
    .limit(10);

  const caja = abierta?.cajas as unknown as { nombre: string } | null;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={Wallet}
        title="Caja"
        description="Apertura, cierre y cuadratura."
        help={
          <>
            <p>La caja controla el efectivo del día. Al <strong>abrirla</strong> declaras con cuánto dinero partes.</p>
            <p>Al <strong>cerrarla</strong>, el sistema compara lo que debería haber (ventas en efectivo + movimientos) con lo que cuentas físicamente, y te muestra la diferencia.</p>
            <p>Necesitas una caja abierta para poder cobrar en el Punto de venta.</p>
          </>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {abierta ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              {caja?.nombre ?? 'Caja'} <Badge className="ml-2">Abierta</Badge>
            </CardTitle>
            <span className="text-sm text-muted-foreground">{fmtFecha(abierta.abierta_en)}</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-8 text-sm">
              <div>
                <div className="text-muted-foreground">Monto apertura</div>
                <div className="text-lg font-semibold">{clp.format(abierta.monto_apertura)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Efectivo esperado</div>
                <div className="text-lg font-semibold">{clp.format(esperado ?? 0)}</div>
              </div>
            </div>
            {/* Movimiento manual de efectivo */}
            <div className="space-y-2 border-t pt-4">
              <div className="text-sm font-medium">Movimiento manual de efectivo</div>
              <form action={registrarMovimientoCaja} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="sesion_id" value={abierta.id} />
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo</Label>
                  <select
                    id="tipo"
                    name="tipo"
                    className="rounded-md border border-input bg-transparent px-2 py-2 text-sm shadow-xs"
                  >
                    <option value="entrada_manual">Entrada</option>
                    <option value="salida_manual">Salida</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monto">Monto</Label>
                  <Input id="monto" name="monto" type="number" min="1" required className="w-32" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input id="descripcion" name="descripcion" placeholder="Ej. retiro a banco" />
                </div>
                <Button type="submit" variant="outline">
                  Registrar
                </Button>
              </form>

              {movimientos.length > 0 && (
                <ul className="divide-y rounded-md border text-sm">
                  {movimientos.map((m, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2">
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">{tipoMov(m.tipo)}</Badge>
                        <span className="text-muted-foreground">{m.descripcion ?? '—'}</span>
                      </span>
                      <span className={`tabular-nums ${Number(m.monto) < 0 ? 'text-destructive' : ''}`}>
                        {clp.format(Number(m.monto))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form action={cerrarCaja} className="flex items-end gap-2 border-t pt-4">
              <input type="hidden" name="sesion_id" value={abierta.id} />
              <div className="space-y-1.5">
                <Label htmlFor="monto_contado">Efectivo contado al cierre</Label>
                <Input id="monto_contado" name="monto_contado" type="number" min="0" required />
              </div>
              <Button type="submit" variant="destructive">
                Cerrar caja
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No hay caja abierta</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={abrirCaja} className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="monto_apertura">Monto de apertura (efectivo inicial)</Label>
                <Input id="monto_apertura" name="monto_apertura" type="number" min="0" defaultValue={0} required />
              </div>
              <Button type="submit">Abrir caja</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Historial de sesiones</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Apertura</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead className="text-right">Inicial</TableHead>
              <TableHead className="text-right">Esperado</TableHead>
              <TableHead className="text-right">Contado</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sesiones?.length ? (
              sesiones.map((s) => {
                const dif =
                  s.monto_cierre != null && s.monto_esperado != null
                    ? Number(s.monto_cierre) - Number(s.monto_esperado)
                    : null;
                return (
                  <TableRow key={s.id}>
                    <TableCell>{fmtFecha(s.abierta_en)}</TableCell>
                    <TableCell>
                      {s.estado === 'abierta' ? <Badge variant="secondary">Abierta</Badge> : fmtFecha(s.cerrada_en)}
                    </TableCell>
                    <TableCell className="text-right">{clp.format(s.monto_apertura)}</TableCell>
                    <TableCell className="text-right">
                      {s.monto_esperado != null ? clp.format(s.monto_esperado) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.monto_cierre != null ? clp.format(s.monto_cierre) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {dif == null ? (
                        '—'
                      ) : (
                        <span className={dif === 0 ? 'text-muted-foreground' : 'text-destructive'}>
                          {clp.format(dif)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  Aún no hay sesiones.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
