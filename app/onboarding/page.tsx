import { crearEmpresa } from './actions';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Configura tu negocio</h1>
          <p className="text-sm text-gray-500">Estos datos identifican a tu empresa en mypyme.</p>
        </div>

        {error && (
          <p className="rounded-md border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={crearEmpresa} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="rut" className="text-sm font-medium">
              RUT empresa
            </label>
            <input
              id="rut"
              name="rut"
              required
              placeholder="76.123.456-7"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="razon_social" className="text-sm font-medium">
              Razón social
            </label>
            <input
              id="razon_social"
              name="razon_social"
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="giro" className="text-sm font-medium">
              Giro <span className="text-gray-400">(opcional)</span>
            </label>
            <input id="giro" name="giro" className="w-full rounded-md border px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="telefono" className="text-sm font-medium">
                Teléfono <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                id="telefono"
                name="telefono"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="direccion" className="text-sm font-medium">
                Dirección <span className="text-gray-400">(opcional)</span>
              </label>
              <input
                id="direccion"
                name="direccion"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="usa_iva" defaultChecked className="size-4" />
            Mi negocio emite con IVA (19%)
          </label>

          <button
            type="submit"
            className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Crear empresa y continuar
          </button>
        </form>
      </div>
    </main>
  );
}
