'use client';

import { useEffect, useState } from 'react';
import { X, ZoomOut } from 'lucide-react';

const KEY = 'aviso-zoom-descartado';

/**
 * Recordatorio suave para usuarios en celular: si la pantalla se ve apretada,
 * bajar el zoom del navegador ayuda a ver más contenido. Solo aparece en móvil
 * (`sm:hidden`) y una sola vez: al cerrarlo se guarda en localStorage.
 */
export function AvisoZoom() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    // Diferido con rAF para no violar react-hooks/set-state-in-effect.
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!visible) return null;

  const cerrar = () => {
    localStorage.setItem(KEY, '1');
    setVisible(false);
  };

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground sm:hidden">
      <ZoomOut className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <span className="flex-1">
        ¿Se ve apretado? Baja el{' '}
        <strong className="font-medium text-foreground">zoom de tu navegador</strong> (menú ⋮ →
        Ajustes del sitio · Zoom) para ver más en pantalla.
      </span>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Entendido, no mostrar de nuevo"
        className="shrink-0 rounded p-0.5 hover:bg-primary/10"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
