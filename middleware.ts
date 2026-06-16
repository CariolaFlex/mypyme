import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - api/webhooks (callbacks externos, p.ej. Flow — sin sesión)
     * - _next/static, _next/image (assets de Next)
     * - favicon, sw.js, manifest, robots, sitemap, iconos, imágenes
     */
    '/((?!api/webhooks|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
