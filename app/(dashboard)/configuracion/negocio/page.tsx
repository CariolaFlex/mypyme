import { Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { guardarNegocio } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

export default async function NegocioPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const [{ data: empresa }, { data: config }] = await Promise.all([
    supabase.from('empresas').select('rut, razon_social, giro, telefono, direccion').single(),
    supabase
      .from('configuracion_negocio')
      .select('usa_iva, precios_con_iva, tasa_iva_default, umbral_stock_bajo')
      .single(),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        icon={Building2}
        title="Negocio"
        description="Datos de tu empresa y configuración de IVA."
        help={
          <>
            <p>Los datos de tu empresa (razón social, RUT) y la configuración de <strong>IVA</strong>.</p>
            <p>Con IVA activado, tus precios se desglosan en neto + IVA en los comprobantes y en el reporte F29.</p>
          </>
        }
      />

      {ok && (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          Cambios guardados.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form action={guardarNegocio} className="space-y-4">
        <div className="space-y-2">
          <Label>RUT</Label>
          <Input value={empresa?.rut ?? ''} disabled className="bg-muted text-muted-foreground" />
          <p className="text-xs text-muted-foreground">El RUT no se puede cambiar.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="razon_social">Razón social</Label>
          <Input id="razon_social" name="razon_social" required defaultValue={empresa?.razon_social ?? ''} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="giro">Giro</Label>
          <Input id="giro" name="giro" defaultValue={empresa?.giro ?? ''} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={empresa?.telefono ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" defaultValue={empresa?.direccion ?? ''} />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tasa_iva_default">Tasa IVA (%)</Label>
            <Input
              id="tasa_iva_default"
              name="tasa_iva_default"
              type="number"
              step="0.01"
              min="0"
              defaultValue={config?.tasa_iva_default ?? 19}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umbral_stock_bajo">Umbral stock bajo</Label>
            <Input
              id="umbral_stock_bajo"
              name="umbral_stock_bajo"
              type="number"
              min="0"
              defaultValue={config?.umbral_stock_bajo ?? 5}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="usa_iva"
            defaultChecked={config?.usa_iva ?? true}
            className="size-4 accent-primary"
          />
          Mi negocio emite con IVA
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="precios_con_iva"
            defaultChecked={config?.precios_con_iva ?? true}
            className="size-4 accent-primary"
          />
          Los precios del POS ya incluyen IVA
        </label>

        <Button type="submit">Guardar cambios</Button>
      </form>
    </div>
  );
}
