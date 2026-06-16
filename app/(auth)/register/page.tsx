import Link from 'next/link';
import { register } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mesh-bg grid-pattern relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div className="blob left-[10%] top-[-6rem] size-[26rem]" style={{ background: '#2563eb' }} />
      <div className="blob bottom-[-8rem] left-[-4rem] size-[22rem]" style={{ background: '#0d1b2a', animationDelay: '-7s' }} />
      <div className="blob right-[15%] top-[55%] size-[18rem]" style={{ background: '#647da6', animationDelay: '-13s' }} />

      <div className="relative w-full max-w-sm animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
        <div className="mb-7 flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-512.png" alt="Gestionala" className="size-16 rounded-2xl shadow-xl glow-brand" />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-grad-brand animate-gradient-x">Gestionala</h1>
            <p className="mt-1 text-sm text-muted-foreground">Empieza gratis. Tu negocio ordenado en minutos.</p>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-2xl shadow-[#0d1b2a]/10">
          <h2 className="mb-1 text-lg font-bold">Crea tu cuenta</h2>
          <p className="mb-4 text-sm text-muted-foreground">14 días de prueba, sin tarjeta.</p>

          {error && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            <Button type="submit" className="grad-brand-vivid w-full border-0 text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]" size="lg">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>

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
