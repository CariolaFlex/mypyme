import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { enforcementActivo, tieneAcceso, cortesiaVigente } from '@/lib/flow/subscription';

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

  // Redirige preservando las cookies que getUser() pudo refrescar. Si no se
  // copian, el navegador se queda con el token rotado/viejo → la próxima
  // request falla la auth y bota a /login (bug de "sesión que se cierra sola").
  const redirigir = (pathname: string, limpiarQuery = false) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    if (limpiarQuery) url.search = '';
    const res = NextResponse.redirect(url);
    for (const c of supabaseResponse.cookies.getAll()) res.cookies.set(c.name, c.value, c);
    return res;
  };

  const { pathname } = request.nextUrl;
  const esRutaAuth = pathname.startsWith('/login') || pathname.startsWith('/register');
  // La home `/` es la landing pública de marketing (accesible sin sesión).
  const esHome = pathname === '/';
  // Rutas públicas (accesibles sin sesión): landing, legales, recuperación de
  // contraseña y el callback de auth (el code del correo llega sin sesión todavía).
  const esRutaPublica =
    esHome ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/recuperar') ||
    pathname.startsWith('/actualizar-clave') ||
    pathname.startsWith('/auth');

  if (!user && !esRutaAuth && !esRutaPublica) {
    return redirigir('/login');
  }

  // Usuario logueado: lo sacamos de la landing y de las pantallas de auth → al app.
  if (user && (esRutaAuth || esHome)) {
    return redirigir('/inicio');
  }

  // Autocuración del claim `empresa_id`: el Auth Hook lo inyecta al emitir un
  // token nuevo. Justo después del onboarding, el token refrescado por la server
  // action puede no haber propagado a ESTA request (carrera con la rotación del
  // refresh-token de Supabase) → el layout del dashboard no ve el claim y rebota
  // a /onboarding (bug "se queda en el registro / hay que recargar"). Acá, si el
  // usuario está en una ruta del dashboard SIN el claim, forzamos UN refresh: como
  // la membresía ya existe, el token nuevo trae el claim y el middleware propaga
  // las cookies a request+response → /inicio carga a la primera. Acotado: solo
  // dispara mientras falta el claim (luego ya viene en el token, no se repite).
  if (user && !esRutaAuth && !esRutaPublica && !pathname.startsWith('/onboarding')) {
    const { data: claimsData } = await supabase.auth.getClaims();
    const tieneEmpresa = (claimsData?.claims as Record<string, unknown> | undefined)?.empresa_id;
    if (!tieneEmpresa) {
      await supabase.auth.refreshSession();
    }
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
        .select('estado_suscripcion, trial_termina_en, acceso_cortesia_hasta')
        .maybeSingle();

      const acceso =
        empresa &&
        (cortesiaVigente(empresa.acceso_cortesia_hasta) ||
          tieneAcceso(empresa.estado_suscripcion, empresa.trial_termina_en));

      if (empresa && !acceso) {
        return redirigir('/suscripcion-requerida', true);
      }
    }
  }

  return supabaseResponse;
}
