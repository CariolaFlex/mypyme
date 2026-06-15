import Script from 'next/script';

/**
 * Analytics con Plausible — privacy-first, sin cookies (no requiere banner de
 * consentimiento, coherente con nuestra Política de Privacidad).
 *
 * GATED: solo se inyecta si `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` está definido.
 * Sin esa env var (dev / hoy en prod) no renderiza nada → inerte.
 * Para activar (Sprint 5): setear el dominio en Vercel, p.ej. `mypyme.cl`.
 * Self-hosting opcional vía `NEXT_PUBLIC_PLAUSIBLE_SRC`.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? 'https://plausible.io/js/script.js';

  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
