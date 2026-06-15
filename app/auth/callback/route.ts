// Callback de Supabase Auth (flujo PKCE). El enlace del correo (recuperación,
// confirmación) llega con un `code` que aquí intercambiamos por una sesión
// (setea la cookie SSR) y luego redirigimos a `next`.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('El enlace es inválido o expiró. Solicítalo de nuevo.')}`
  );
}
