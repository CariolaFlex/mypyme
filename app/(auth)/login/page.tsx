import Link from 'next/link';
import { login } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mesh-bg grid-pattern relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Blobs navy flotantes */}
      <div className="blob left-[10%] top-[-6rem] size-[26rem]" style={{ background: '#2563eb' }} />
      <div className="blob bottom-[-8rem] right-[-4rem] size-[22rem]" style={{ background: '#0d1b2a', animationDelay: '-7s' }} />
      <div className="blob left-[40%] top-[55%] size-[18rem]" style={{ background: '#647da6', animationDelay: '-13s' }} />

      <div className="relative w-full max-w-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
        {/* Marca */}
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-512.png"
            alt="Gestionala"
            className="size-16 rounded-2xl shadow-xl glow-brand"
          />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-grad-brand animate-gradient-x">
              Gestionala
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu caja, inventario y reportes en un solo lugar
            </p>
          </div>
        </div>

        {/* Card glass */}
        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-[#0d1b2a]/10">
          <h2 className="mb-1 text-lg font-bold">Inicia sesión</h2>
          <p className="mb-4 text-sm text-muted-foreground">Entra a tu cuenta para continuar.</p>

          {message && (
            <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">{message}</p>
          )}
          {error && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            <Button type="submit" className="grad-brand-vivid w-full border-0 text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]" size="lg">
              Entrar
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
              Regístrate
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/legal/terminos" className="underline-offset-4 hover:underline">Términos</Link>
          {' · '}
          <Link href="/legal/privacidad" className="underline-offset-4 hover:underline">Privacidad</Link>
        </p>
      </div>
    </main>
  );
}
