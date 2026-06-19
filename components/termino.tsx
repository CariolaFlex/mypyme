'use client';

import { useState } from 'react';
import { GLOSARIO_MAP } from '@/lib/glosario';

/**
 * Término del glosario con definición al pasar el mouse (o al tocar/enfocar).
 * Uso: <Termino slug="iva_debito">IVA débito</Termino>. Si no se pasan children,
 * muestra el nombre canónico del término. Si el slug no existe, degrada a texto
 * plano. Todo en <span> para poder usarse dentro de <p>, celdas y títulos.
 */
export function Termino({
  slug,
  children,
  align = 'left',
}: {
  slug: string;
  children?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [abierto, setAbierto] = useState(false);
  const item = GLOSARIO_MAP[slug];
  const label = children ?? item?.termino ?? slug;

  if (!item) return <>{label}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        style={{ font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}
        className="cursor-help border-b border-dotted border-current/50 align-baseline"
        aria-label={`Qué es ${item.termino}`}
        aria-expanded={abierto}
        onMouseEnter={() => setAbierto(true)}
        onMouseLeave={() => setAbierto(false)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onClick={() => setAbierto((v) => !v)}
      >
        {label}
      </button>
      {abierto && (
        <span
          role="tooltip"
          className={`glass-strong absolute top-7 z-50 block w-64 rounded-xl p-3 text-left text-xs font-normal leading-relaxed shadow-2xl shadow-[#0d1b2a]/20 duration-150 animate-in fade-in-0 zoom-in-95 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <span className="block text-sm font-semibold text-foreground">{item.termino}</span>
          <span className="mt-1 block text-muted-foreground">{item.definicion}</span>
          <span className="mt-1.5 block text-muted-foreground/80">
            <span className="font-medium">Ej:</span> {item.ejemplo}
          </span>
        </span>
      )}
    </span>
  );
}
