import { crearEmpresa } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mesh-bg grid-pattern relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="blob left-[10%] top-[-6rem] size-[26rem]" style={{ background: '#2563eb' }} />
      <div className="blob bottom-[-8rem] right-[-4rem] size-[22rem]" style={{ background: '#0d1b2a', animationDelay: '-7s' }} />

      <div className="relative w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-16 rounded-2xl shadow-xl glow-brand" />
          <div>
            <h1 className="text-2xl font-black tracking-tight">Configura tu negocio</h1>
            <p className="mt-1 text-sm text-muted-foreground">Último paso: estos datos identifican a tu empresa.</p>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-[#0d1b2a]/10">
          {error && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <form action={crearEmpresa} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rut">RUT empresa</Label>
              <Input id="rut" name="rut" required placeholder="76.123.456-7" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón social</Label>
              <Input id="razon_social" name="razon_social" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="giro">
                Giro <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input id="giro" name="giro" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">
                  Teléfono <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="telefono" name="telefono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">
                  Dirección <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="direccion" name="direccion" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="usa_iva" defaultChecked className="size-4 accent-primary" />
              Mi negocio emite con IVA (19%)
            </label>
            <Button type="submit" className="grad-brand-vivid w-full border-0 text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]" size="lg">
              Crear empresa y continuar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
