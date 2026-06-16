import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { solicitarReset } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 p-6">
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-20 size-[24rem] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-sm animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-14 rounded-2xl shadow-lg shadow-primary/25" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Gestionala</h1>
            <p className="text-sm text-muted-foreground">Recupera el acceso a tu cuenta</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardContent className="pt-2">
            {sent ? (
              <div className="space-y-3 text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="size-5" />
                </div>
                <h2 className="text-lg font-semibold">Revisa tu correo</h2>
                <p className="text-sm text-muted-foreground">
                  Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu
                  contraseña. Revisa también tu carpeta de spam.
                </p>
                <Link
                  href="/login"
                  className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mb-1 text-lg font-semibold">¿Olvidaste tu contraseña?</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Ingresa tu correo y te enviaremos un enlace para crear una nueva.
                </p>

                <form action={solicitarReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@correo.cl" />
                  </div>
                  <Button type="submit" className="w-full" size="lg">Enviar enlace</Button>
                </form>

                <p className="mt-5 text-center text-sm text-muted-foreground">
                  ¿La recordaste?{' '}
                  <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
