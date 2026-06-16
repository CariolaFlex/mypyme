import Link from 'next/link';
import { actualizarClave } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export default async function ActualizarClavePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Debe existir una sesión de recuperación (creada por /auth/callback).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
            <p className="text-sm text-muted-foreground">Crea tu nueva contraseña</p>
          </div>
        </div>

        <Card className="shadow-xl shadow-foreground/5">
          <CardContent className="pt-2">
            {!user ? (
              <div className="space-y-3 text-center">
                <h2 className="text-lg font-semibold">Enlace inválido o expirado</h2>
                <p className="text-sm text-muted-foreground">
                  El enlace para restablecer tu contraseña no es válido o ya caducó.
                </p>
                <Link
                  href="/recuperar"
                  className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Solicitar uno nuevo
                </Link>
              </div>
            ) : (
              <>
                <h2 className="mb-1 text-lg font-semibold">Nueva contraseña</h2>
                <p className="mb-4 text-sm text-muted-foreground">Elige una contraseña segura (mínimo 6 caracteres).</p>

                {error && (
                  <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <form action={actualizarClave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Nueva contraseña</Label>
                    <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Repetir contraseña</Label>
                    <Input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
                  </div>
                  <Button type="submit" className="w-full" size="lg">Guardar contraseña</Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
