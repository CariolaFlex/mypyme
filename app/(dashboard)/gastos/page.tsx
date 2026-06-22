import { TrendingDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { registrarGasto } from './actions';
import { CategoriasGastoManager } from './categorias-gasto-manager';
import { GastoRowActions } from './row-actions';
import { MontoTributario } from '@/components/monto-tributario';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, fmtFecha } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type GastoRow = {
  id: string;
  fecha: string;
  descripcion: string;
  monto_neto: number;
  monto_iva: number;
  monto_total: number;
  tasa_iva: number;
  sesion_caja_id: string | null;
  categoria_gasto_id: string | null;
  proveedor_id: string | null;
  tipo_documento: string;
  categorias_gasto: { nombre: string } | null;
  proveedores: { nombre: string } | null;
};

const DOC_TAG: Record<string, string> = {
  boleta: 'boleta',
  factura_exenta: 'factura exenta',
  boleta_exenta: 'boleta exenta',
  sin_documento: 'sin documento',
};

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: categorias }, { data: proveedores }, { data: config }, { data: sesion }, { data: gastos }] =
    await Promise.all([
      supabase.from('categorias_gasto').select('id, nombre').order('nombre'),
      supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.from('configuracion_negocio').select('tasa_iva_default').maybeSingle(),
      supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle(),
      supabase
        .from('gastos')
        .select(
          'id, fecha, descripcion, monto_neto, monto_iva, monto_total, tasa_iva, sesion_caja_id, categoria_gasto_id, proveedor_id, tipo_documento, categorias_gasto(nombre), proveedores(nombre)'
        )
        .order('fecha', { ascending: false })
        .limit(50),
    ]);

  const ivaDefault = Number(config?.tasa_iva_default ?? 19);
  const cajaAbierta = !!sesion;
  const rows = (gastos as unknown as GastoRow[] | null) ?? [];
  const totalMes = rows.reduce((s, g) => s + Number(g.monto_total), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={TrendingDown}
        title="Gastos"
        description="Registra los gastos de tu negocio. El IVA suma al crédito fiscal del F29."
        help={
          <>
            <p>Anota cada <strong>egreso del negocio</strong>: arriendo, luz, agua, sueldos, insumos, etc.</p>
            <p>Si marcas «pagar en efectivo» con la caja abierta, el monto se descuenta de la caja.</p>
            <p>El IVA de tus gastos suma a tu <strong>crédito fiscal</strong> en el reporte de IVA (F29).</p>
          </>
        }
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo gasto</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={registrarGasto} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="categoria_gasto_id">Categoría *</Label>
              <select
                id="categoria_gasto_id"
                name="categoria_gasto_id"
                required
                className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
              >
                {categorias?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proveedor_id">Proveedor</Label>
              <select
                id="proveedor_id"
                name="proveedor_id"
                className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
              >
                <option value="">— Sin proveedor —</option>
                {proveedores?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input id="descripcion" name="descripcion" required placeholder="Ej. Compra de café en grano" />
            </div>
            <MontoTributario idPrefix="g-" defaultTasa={ivaDefault} />
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" name="fecha" type="date" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pagar_efectivo" disabled={!cajaAbierta} className="size-4" />
                Pagar en efectivo (descuenta caja)
                {!cajaAbierta && <span className="text-xs text-muted-foreground">— sin caja abierta</span>}
              </label>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Registrar gasto</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <CategoriasGastoManager categorias={categorias ?? []} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Últimos gastos</h2>
          <span className="text-sm text-muted-foreground">
            Total listado: <span className="font-semibold text-foreground">{clp.format(totalMes)}</span>
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{fmtFecha(g.fecha)}</TableCell>
                  <TableCell>{g.categorias_gasto?.nombre ?? '—'}</TableCell>
                  <TableCell className="max-w-48 truncate">
                    {g.descripcion}
                    {DOC_TAG[g.tipo_documento] && (
                      <span className="ml-1 text-xs text-muted-foreground">· {DOC_TAG[g.tipo_documento]}</span>
                    )}
                    {g.sesion_caja_id && <span className="ml-1 text-xs text-muted-foreground">(efectivo)</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{g.proveedores?.nombre ?? '—'}</TableCell>
                  <TableCell className="text-right">{clp.format(Number(g.monto_neto))}</TableCell>
                  <TableCell className="text-right">{clp.format(Number(g.monto_iva))}</TableCell>
                  <TableCell className="text-right">{clp.format(Number(g.monto_total))}</TableCell>
                  <TableCell className="text-right">
                    <GastoRowActions
                      gasto={{
                        id: g.id,
                        categoria_gasto_id: g.categoria_gasto_id,
                        proveedor_id: g.proveedor_id,
                        descripcion: g.descripcion,
                        fecha: g.fecha,
                        monto_total: Number(g.monto_total),
                        tasa_iva: Number(g.tasa_iva),
                        sesion_caja_id: g.sesion_caja_id,
                        tipo_documento: g.tipo_documento,
                      }}
                      categorias={categorias ?? []}
                      proveedores={proveedores ?? []}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  Aún no hay gastos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
