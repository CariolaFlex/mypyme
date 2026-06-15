import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { enforcementActivo, tieneAcceso } from '@/lib/flow/subscription';

/**
 * Refresca la sesión de Supabase en cada request y protege rutas.
 * - Sin sesión + ruta protegida → redirige a /login.
 * - Con sesión + /login o /register → redirige a / (dashboard).
 * El gate de onboarding (empresa creada o no) lo hace el layout del dashboard.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() valida el token contra el servidor de Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaAuth = pathname.startsWith('/login') || pathname.startsWith('/register');
  // Rutas públicas (accesibles sin sesión): legales, recuperación de contraseña
  // y el callback de auth (el code del correo llega sin sesión todavía).
  const esRutaPublica =
    pathname.startsWith('/legal') ||
    pathname.startsWith('/recuperar') ||
    pathname.startsWith('/actualizar-clave') ||
    pathname.startsWith('/auth');

  if (!user && !esRutaAuth && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && esRutaAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Enforcement de suscripción (gated por FLOW_ENFORCE). La query a la DB SOLO
  // corre cuando el flag está activo → costo cero mientras esté apagado (default).
  if (user && enforcementActivo()) {
    const esExento =
      esRutaAuth ||
      esRutaPublica ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/suscripcion-requerida') ||
      // El admin reactiva aquí (incluye /retorno del enroll de Flow).
      pathname.startsWith('/configuracion/suscripcion');

    if (!esExento) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('estado_suscripcion, trial_termina_en')
        .maybeSingle();

      if (empresa && !tieneAcceso(empresa.estado_suscripcion, empresa.trial_termina_en)) {
        const url = request.nextUrl.clone();
        url.pathname = '/suscripcion-requerida';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
