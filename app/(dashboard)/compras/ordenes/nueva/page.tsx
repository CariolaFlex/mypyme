import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NuevaOcClient } from './nueva-oc-client';

export const dynamic = 'force-dynamic';

export default async function NuevaOrdenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: proveedores }, { data: productos }, { data: config }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre, tasa_iva').eq('activo', true).order('nombre'),
    supabase.from('configuracion_negocio').select('tasa_iva_default').maybeSingle(),
  ]);

  const ivaDefault = Number(config?.tasa_iva_default ?? 19);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nueva orden de compra</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/compras/ordenes" className="underline-offset-2 hover:underline">← Volver a órdenes</Link>
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
          <CardHeader>
            <CardTitle className="text-base">Detalle</CardTitle>
          </CardHeader>
          <CardContent>
            <NuevaOcClient
              proveedores={proveedores ?? []}
              productos={productos ?? []}
              ivaDefault={ivaDefault}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
