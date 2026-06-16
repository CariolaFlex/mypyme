import type { MetadataRoute } from 'next';

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mypyme-blond.vercel.app').replace(/\/$/, '');

// Solo rutas públicas indexables (el resto está tras login y bloqueado en robots).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/legal/terminos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/privacidad`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
