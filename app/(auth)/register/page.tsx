import Link from 'next/link';
import { register } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 size-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-14 rounded-2xl shadow-lg shadow-primary/25" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gestionala</h1>
            <p className="text-sm text-muted-foreground">Empieza gratis. Tu negocio ordenado en minutos.</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardContent className="pt-2">
            <h2 className="mb-1 text-lg font-semibold">Crea tu cuenta</h2>
            <p className="mb-4 text-sm text-muted-foreground">14 días de prueba, sin tarjeta.</p>

            {error && (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <form action={register} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@correo.cl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" placeholder="mín. 6 caracteres" />
              </div>
              <Button type="submit" className="w-full" size="lg">Crear cuenta</Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al registrarte aceptas nuestros{' '}
          <Link href="/legal/terminos" className="underline-offset-4 hover:underline">Términos</Link>
          {' y la '}
          <Link href="/legal/privacidad" className="underline-offset-4 hover:underline">Política de Privacidad</Link>.
        </p>
      </div>
    </main>
  );
}
