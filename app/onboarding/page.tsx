import { Store } from 'lucide-react';
import { crearEmpresa } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 size-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Configura tu negocio</h1>
            <p className="text-sm text-muted-foreground">Último paso: estos datos identifican a tu empresa.</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardContent className="pt-2">
          {error && (
            <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            <Button type="submit" className="w-full" size="lg">
              Crear empresa y continuar
            </Button>
          </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
