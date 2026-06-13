import { createClient } from '@/lib/supabase/server';
import { guardarNegocio } from './actions';

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
      <div>
        <h1 className="text-2xl font-bold">Negocio</h1>
        <p className="text-sm text-gray-500">Datos de tu empresa y configuración de IVA.</p>
      </div>

      {ok && (
        <p className="rounded-md border border-green-600/30 bg-green-600/10 px-3 py-2 text-sm text-green-700">
          Cambios guardados.
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={guardarNegocio} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">RUT</label>
          <input
            value={empresa?.rut ?? ''}
            disabled
            className="w-full rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-500"
          />
          <p className="text-xs text-gray-400">El RUT no se puede cambiar.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="razon_social" className="text-sm font-medium">
            Razón social
          </label>
          <input
            id="razon_social"
            name="razon_social"
            required
            defaultValue={empresa?.razon_social ?? ''}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="giro" className="text-sm font-medium">
            Giro
          </label>
          <input
            id="giro"
            name="giro"
            defaultValue={empresa?.giro ?? ''}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="telefono" className="text-sm font-medium">
              Teléfono
            </label>
            <input
              id="telefono"
              name="telefono"
              defaultValue={empresa?.telefono ?? ''}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="direccion" className="text-sm font-medium">
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              defaultValue={empresa?.direccion ?? ''}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <hr className="my-2" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="tasa_iva_default" className="text-sm font-medium">
              Tasa IVA (%)
            </label>
            <input
              id="tasa_iva_default"
              name="tasa_iva_default"
              type="number"
              step="0.01"
              min="0"
              defaultValue={config?.tasa_iva_default ?? 19}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="umbral_stock_bajo" className="text-sm font-medium">
              Umbral stock bajo
            </label>
            <input
              id="umbral_stock_bajo"
              name="umbral_stock_bajo"
              type="number"
              min="0"
              defaultValue={config?.umbral_stock_bajo ?? 5}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="usa_iva"
            defaultChecked={config?.usa_iva ?? true}
            className="size-4"
          />
          Mi negocio emite con IVA
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="precios_con_iva"
            defaultChecked={config?.precios_con_iva ?? true}
            className="size-4"
          />
          Los precios del POS ya incluyen IVA
        </label>

        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
