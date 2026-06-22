import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { crearFactura } from '../actions';
import { MontoTributario } from '@/components/monto-tributario';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type OcOption = { id: string; fecha: string; monto_total: number; proveedores: { nombre: string } | null };

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: proveedores }, { data: ordenes }, { data: config }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    supabase
      .from('ordenes_compra')
      .select('id, fecha, monto_total, proveedores(nombre)')
      .in('estado', ['recibida', 'recibida_parcial', 'aprobada'])
      .order('creado_en', { ascending: false })
      .limit(30),
    supabase.from('configuracion_negocio').select('tasa_iva_default').maybeSingle(),
  ]);

  const ivaDefault = Number(config?.tasa_iva_default ?? 19);
  const ocs = (ordenes as unknown as OcOption[] | null) ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ingresar compra a mano</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/compras/facturas" className="underline-offset-2 hover:underline">← Volver a cuentas por pagar</Link>
          {' · '}
          <Link href="/compras/escanear-factura" className="underline-offset-2 hover:underline">o escanear el documento con la cámara</Link>
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {proveedores?.length === 0 ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          Necesitas un proveedor activo.{' '}
          <Link href="/compras/proveedores" className="underline">Crear proveedor</Link>
        </p>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Datos de la factura</CardTitle></CardHeader>
          <CardContent>
            <form action={crearFactura} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="proveedor_id">Proveedor *</Label>
                <select id="proveedor_id" name="proveedor_id" required
                  className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs">
                  {proveedores?.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numero_factura">N° factura *</Label>
                <Input id="numero_factura" name="numero_factura" required placeholder="F-12345" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="orden_compra_id">Orden de compra (opcional)</Label>
                <select id="orden_compra_id" name="orden_compra_id"
                  className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs">
                  <option value="">— Sin OC —</option>
                  {ocs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.proveedores?.nombre ?? 'OC'} · {o.fecha} · ${Number(o.monto_total).toLocaleString('es-CL')}
                    </option>
                  ))}
                </select>
              </div>
              <MontoTributario idPrefix="f-" defaultTasa={ivaDefault} />
              <div className="space-y-1.5">
                <Label htmlFor="fecha">Fecha</Label>
                <Input id="fecha" name="fecha" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vencimiento">Vencimiento</Label>
                <Input id="vencimiento" name="vencimiento" type="date" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Crear factura</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
