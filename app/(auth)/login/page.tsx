import Link from 'next/link';
import { Store } from 'lucide-react';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-6">
      {/* Decoración */}
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 size-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">mypyme</h1>
            <p className="text-sm text-muted-foreground">Tu caja, inventario y reportes en un solo lugar</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardContent className="pt-2">
            <h2 className="mb-1 text-lg font-semibold">Inicia sesión</h2>
            <p className="mb-4 text-sm text-muted-foreground">Entra a tu cuenta para continuar.</p>

            {message && (
              <p className="mb-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">{message}</p>
            )}
            {error && (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <form action={login} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@correo.cl" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="/recuperar"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" size="lg">Entrar</Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                Regístrate
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/legal/terminos" className="underline-offset-4 hover:underline">Términos</Link>
          {' · '}
          <Link href="/legal/privacidad" className="underline-offset-4 hover:underline">Privacidad</Link>
        </p>
      </div>
    </main>
  );
}
