import Link from 'next/link';
import { actualizarClave } from '../actions';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <main className="mesh-bg grid-pattern relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="blob left-[10%] top-[-6rem] size-[26rem]" style={{ background: '#2563eb' }} />
      <div className="blob bottom-[-8rem] right-[-4rem] size-[22rem]" style={{ background: '#0d1b2a', animationDelay: '-7s' }} />

      <div className="relative w-full max-w-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-16 rounded-2xl shadow-xl glow-brand" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-grad-brand animate-gradient-x">Gestionala</h1>
            <p className="mt-1 text-sm text-muted-foreground">Crea tu nueva contraseña</p>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-[#0d1b2a]/10">
          {!user ? (
            <div className="space-y-3 text-center">
              <h2 className="text-lg font-bold">Enlace inválido o expirado</h2>
              <p className="text-sm text-muted-foreground">
                El enlace para restablecer tu contraseña no es válido o ya caducó.
              </p>
              <Link
                href="/recuperar"
                className="inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Solicitar uno nuevo
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-bold">Nueva contraseña</h2>
              <p className="mb-4 text-sm text-muted-foreground">Elige una contraseña segura (mínimo 6 caracteres).</p>

              {error && (
                <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
                <Button type="submit" className="grad-brand-vivid w-full border-0 text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]" size="lg">
                  Guardar contraseña
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
