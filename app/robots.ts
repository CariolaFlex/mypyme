import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mypyme-blond.vercel.app').replace(/\/$/, '');

// Indexa la landing y las legales; bloquea todo lo que vive tras login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/legal'],
      disallow: [
        '/inicio', '/pos', '/caja', '/inventario', '/compras', '/gastos',
        '/reportes', '/configuracion', '/onboarding', '/suscripcion-requerida',
        '/login', '/register', '/recuperar', '/actualizar-clave', '/auth', '/api',
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
