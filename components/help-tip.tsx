'use client';

import { useEffect, useRef, useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import Link from 'next/link';

/**
 * Botón de ayuda contextual: un "?" que al tocarlo muestra un globo con una
 * explicación breve de qué es la sección y para qué sirve. Cierra al hacer clic
 * fuera o con Esc. Pensado para usuarios no técnicos (dueños de almacén).
 */
export function HelpTip({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Ayuda"
        aria-expanded={abierto}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <HelpCircle className="size-[18px]" />
      </button>

      {abierto && (
        <div
          role="dialog"
          className="glass-strong absolute left-0 top-8 z-50 w-72 rounded-2xl p-4 text-left shadow-2xl shadow-[#0d1b2a]/20 duration-150 animate-in fade-in-0 zoom-in-95 sm:w-80"
        >
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{titulo ?? '¿Qué es esto?'}</span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="-mr-1 -mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            {children}
          </div>
          <Link
            href="/ayuda"
            onClick={() => setAbierto(false)}
            className="mt-3 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver centro de ayuda →
          </Link>
        </div>
      )}
    </div>
  );
}
