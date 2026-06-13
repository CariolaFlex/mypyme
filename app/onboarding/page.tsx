import { crearEmpresa } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configura tu negocio</CardTitle>
          <CardDescription>Estos datos identifican a tu empresa en mypyme.</CardDescription>
        </CardHeader>
        <CardContent>
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
    </main>
  );
}
