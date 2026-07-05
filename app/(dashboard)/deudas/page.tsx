import { HandCoins, Download, Search, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, fmtFecha } from '@/lib/reportes';
import { crearDeuda } from './actions';
import { DeudaRowActions } from './row-actions';

export const dynamic = 'force-dynamic';

type DeudaRow = {
  id: string;
  tipo: 'por_cobrar' | 'por_pagar';
  categoria: string;
  contraparte: string;
  descripcion: string | null;
  monto_total: number;
  saldo: number;
  fecha: string;
  fecha_vencimiento: string | null;
  estado: string;
  proveedor_id: string | null;
  proveedores: { nombre: string } | null;
};

const CATEGORIA_LABEL: Record<string, string> = {
  cliente: 'Cliente', empleado: 'Empleado', personal: 'Personal',
  proveedor: 'Proveedor', servicio: 'Servicio', otro: 'Otro',
};
const selectCls = 'w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs';

export default async function DeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; ver?: string; q?: string }>;
}) {
  const { ok, error, ver, q } = await searchParams;
  const supabase = await createClient();

  const [{ data: deudas }, { data: proveedores }] = await Promise.all([
    supabase
      .from('deudas')
      .select(
        'id, tipo, categoria, contraparte, descripcion, monto_total, saldo, fecha, fecha_vencimiento, estado, proveedor_id, proveedores(nombre)'
      )
      .order('estado', { ascending: true }) // pendientes primero
      .order('fecha', { ascending: false })
      .limit(500),
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
  ]);

  const rows = (deudas as unknown as DeudaRow[] | null) ?? [];
  const proveedoresList = (proveedores as { id: string; nombre: string }[] | null) ?? [];
  const hoy = new Date().toISOString().slice(0, 10);

  const pendientes = rows.filter((d) => d.estado === 'pendiente');
  const porCobrar = pendientes.filter((d) => d.tipo === 'por_cobrar').reduce((s, d) => s + Number(d.saldo), 0);
  const porPagar = pendientes.filter((d) => d.tipo === 'por_pagar').reduce((s, d) => s + Number(d.saldo), 0);
  const vencidas = pendientes.filter((d) => d.fecha_vencimiento && d.fecha_vencimiento < hoy);
  const saldoVencido = vencidas.reduce((s, d) => s + Number(d.saldo), 0);

  // Filtro por estado/tipo (?ver=cobrar|pagar|pagadas|vencidas) + búsqueda (?q=).
  const term = (q ?? '').trim().toLowerCase();
  const visibles = rows
    .filter((d) =>
      ver === 'cobrar' ? d.tipo === 'por_cobrar' && d.estado === 'pendiente'
      : ver === 'pagar' ? d.tipo === 'por_pagar' && d.estado === 'pendiente'
      : ver === 'pagadas' ? d.estado === 'pagada'
      : ver === 'vencidas' ? d.estado === 'pendiente' && !!d.fecha_vencimiento && d.fecha_vencimiento < hoy
      : true
    )
    .filter((d) =>
      !term ||
      d.contraparte.toLowerCase().includes(term) ||
      (d.descripcion ?? '').toLowerCase().includes(term)
    );

  const exportQs = new URLSearchParams();
  if (ver) exportQs.set('ver', ver);
  if (term) exportQs.set('q', term);
  const exportHref = `/deudas/export${exportQs.toString() ? `?${exportQs}` : ''}`;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={HandCoins}
        title="Deudas"
        description="Fiado de clientes, préstamos, deudas personales y cuentas informales — todo con su saldo y abonos."
        help={
          <>
            <p><strong>Por cobrar</strong>: lo que te deben (fiado de clientes, préstamos a empleados).</p>
            <p><strong>Por pagar</strong>: lo que debes (deudas personales, proveedores informales, servicios).</p>
            <p>Registra <strong>abonos parciales</strong>: al llegar el saldo a 0 la deuda se marca pagada sola.</p>
            <p>Las facturas de proveedor formales van en <strong>Cuentas por pagar</strong>, no acá.</p>
          </>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && !error && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Listo, cambios guardados.
        </p>
      )}
      {vencidas.length > 0 && (
        <a
          href="/deudas?ver=vencidas"
          className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {vencidas.length} {vencidas.length === 1 ? 'deuda vencida' : 'deudas vencidas'} — {clp.format(saldoVencido)} en total. Toca para verlas.
          </span>
        </a>
      )}

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-emerald-500/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Te deben (por cobrar)</p>
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{clp.format(porCobrar)}</p>
        </div>
        <div className="rounded-lg border bg-red-500/5 px-4 py-3">
          <p className="text-xs text-muted-foreground">Debes (por pagar)</p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">{clp.format(porPagar)}</p>
        </div>
      </div>

      {/* Nueva deuda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva deuda</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={crearDeuda} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <select id="tipo" name="tipo" required className={selectCls}>
                <option value="por_cobrar">Por cobrar (me deben)</option>
                <option value="por_pagar">Por pagar (yo debo)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoría *</Label>
              <select id="categoria" name="categoria" required className={selectCls}>
                {Object.entries(CATEGORIA_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contraparte">Nombre (quién debe / a quién) *</Label>
              <Input id="contraparte" name="contraparte" required placeholder="Ej. Juan Pérez" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proveedor_id">Proveedor (si aplica)</Label>
              <select id="proveedor_id" name="proveedor_id" className={selectCls}>
                <option value="">— No aplica —</option>
                {proveedores?.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" name="descripcion" placeholder="Ej. Mercadería fiada semana 27" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="monto">Monto *</Label>
              <Input id="monto" name="monto" type="number" min="1" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input id="fecha" name="fecha" type="date" defaultValue={hoy} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha_vencimiento">Vence</Label>
                <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Registrar deuda</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filtros + listado */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {([['', 'Todas'], ['cobrar', 'Por cobrar'], ['pagar', 'Por pagar'], ['vencidas', 'Vencidas'], ['pagadas', 'Pagadas']] as const).map(
            ([v, l]) => {
              const params = new URLSearchParams();
              if (v) params.set('ver', v);
              if (term) params.set('q', term);
              const href = params.toString() ? `/deudas?${params}` : '/deudas';
              return (
                <a
                  key={v}
                  href={href}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    (ver ?? '') === v
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {l}
                </a>
              );
            }
          )}
          <form action="/deudas" className="relative ml-auto">
            {ver && <input type="hidden" name="ver" value={ver} />}
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Buscar nombre…"
              className="h-8 w-44 pl-8 text-xs"
            />
          </form>
          <a
            href={exportHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1 text-xs transition-colors hover:bg-muted"
          >
            <Download className="size-3.5" /> Exportar
          </a>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length ? (
              visibles.map((d) => {
                const vencida =
                  d.estado === 'pendiente' && d.fecha_vencimiento && d.fecha_vencimiento < hoy;
                return (
                  <TableRow key={d.id} className={d.estado === 'pagada' ? 'opacity-60' : ''}>
                    <TableCell>{fmtFecha(d.fecha)}</TableCell>
                    <TableCell className="max-w-40">
                      <span className="block truncate font-medium">{d.contraparte}</span>
                      {(d.descripcion || d.proveedores?.nombre) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {d.descripcion ?? d.proveedores?.nombre}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          d.tipo === 'por_cobrar'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {d.tipo === 'por_cobrar' ? 'Por cobrar' : 'Por pagar'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{CATEGORIA_LABEL[d.categoria] ?? d.categoria}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(d.monto_total))}</TableCell>
                    <TableCell className="text-right font-medium">
                      {d.estado === 'pagada' ? (
                        <span className="text-xs text-muted-foreground">Pagada ✓</span>
                      ) : (
                        clp.format(Number(d.saldo))
                      )}
                    </TableCell>
                    <TableCell className={vencida ? 'text-xs font-medium text-red-600 dark:text-red-400' : 'text-xs text-muted-foreground'}>
                      {d.fecha_vencimiento ? `${fmtFecha(d.fecha_vencimiento)}${vencida ? ' ⚠' : ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeudaRowActions
                        deuda={{
                          id: d.id,
                          tipo: d.tipo,
                          categoria: d.categoria,
                          contraparte: d.contraparte,
                          descripcion: d.descripcion,
                          monto_total: Number(d.monto_total),
                          saldo: Number(d.saldo),
                          fecha: d.fecha,
                          fecha_vencimiento: d.fecha_vencimiento,
                          estado: d.estado,
                          proveedor_id: d.proveedor_id,
                        }}
                        proveedores={proveedoresList}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  No hay deudas {ver === 'pagadas' ? 'pagadas' : 'registradas'}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
