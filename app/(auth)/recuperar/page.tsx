import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { solicitarReset } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

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
            <p className="mt-1 text-sm text-muted-foreground">Recupera el acceso a tu cuenta</p>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-[#0d1b2a]/10">
          {sent ? (
            <div className="space-y-3 text-center">
              <div className="grad-brand-vivid mx-auto flex size-12 items-center justify-center rounded-2xl text-white shadow-lg">
                <KeyRound className="size-5" />
              </div>
              <h2 className="text-lg font-bold">Revisa tu correo</h2>
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu
                contraseña. Revisa también tu carpeta de spam.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-lg font-bold">¿Olvidaste tu contraseña?</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Ingresa tu correo y te enviaremos un enlace para crear una nueva.
              </p>

              <form action={solicitarReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@correo.cl" />
                </div>
                <Button type="submit" className="grad-brand-vivid w-full border-0 text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]" size="lg">
                  Enviar enlace
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                ¿La recordaste?{' '}
                <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
