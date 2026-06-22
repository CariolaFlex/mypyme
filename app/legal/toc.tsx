'use client';

import { useEffect, useState } from 'react';

type Item = { id: string; texto: string };

/** Índice de navegación lateral: lee los <h2 id> del artículo legal y resalta
 *  la sección visible. Robusto y DRY: sirve para Términos y Privacidad sin
 *  duplicar la lista de secciones. */
export function TocLegal() {
  const [items, setItems] = useState<Item[]>([]);
  const [activo, setActivo] = useState('');

  useEffect(() => {
    const hs = Array.from(document.querySelectorAll<HTMLHeadingElement>('#legal-article h2[id]'));
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActivo((e.target as HTMLElement).id);
      },
      { rootMargin: '0px 0px -75% 0px', threshold: 0 }
    );
    hs.forEach((h) => obs.observe(h));
    // Diferido (no setState síncrono en el effect): la lista se construye del DOM ya pintado.
    const raf = requestAnimationFrame(() => setItems(hs.map((h) => ({ id: h.id, texto: h.textContent ?? '' }))));
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <nav className="sticky top-10 hidden max-h-[calc(100vh-5rem)] overflow-auto lg:block">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Contenido</p>
      <ul className="space-y-1 border-l border-border text-sm">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`-ml-px block border-l-2 py-1 pl-3 transition-colors ${
                activo === it.id
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {it.texto}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
