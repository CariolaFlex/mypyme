'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Botones flotantes de navegación: atrás / adelante / inicio. Discretos
 * (semi-translúcidos, esquina inferior derecha) y siempre a mano — pensados
 * para moverse rápido entre pantallas profundas (ej. detalle de factura →
 * volver al listado) sin ir al sidebar.
 *
 * En móvil se elevan sobre la barra inferior de tabs. En el POS no se
 * muestran: esa pantalla es de operación continua y el espacio es sagrado.
 */
export function NavFlotante() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname.startsWith('/pos')) return null;
  // En el dashboard (home) el botón de inicio sobra; atrás/adelante quedan.
  const enInicio = pathname === '/inicio';

  const btn =
    'flex size-10 items-center justify-center rounded-full border bg-background/75 text-muted-foreground shadow-md backdrop-blur transition-all hover:scale-105 hover:bg-background hover:text-foreground active:scale-95';

  return (
    <div
      className={cn(
        'fixed right-3 z-30 flex flex-col gap-2',
        // Sobre la tab bar móvil (+safe area); en desktop, pegado abajo.
        'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6'
      )}
    >
      {!enInicio && (
        <Link href="/inicio" aria-label="Ir al inicio" title="Inicio" className={btn}>
          <Home className="size-4" />
        </Link>
      )}
      <button type="button" onClick={() => router.back()} aria-label="Volver atrás" title="Atrás" className={btn}>
        <ArrowLeft className="size-4" />
      </button>
      <button type="button" onClick={() => router.forward()} aria-label="Ir adelante" title="Adelante" className={btn}>
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
