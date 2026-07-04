/**
 * Parsing universal de montos: decimales, formato latino (1.234,56) vs
 * anglosajón (1,234.56) y detección de moneda por símbolo/código.
 *
 * El parser de facturas chilenas asumía CLP entero ("todo dígito es plata");
 * acá se generaliza sin perder ese caso: "1.234.567" sigue dando 1234567.
 */

import type { Moneda } from './types';

/** Símbolo/código → moneda. El orden importa: los prefijos más específicos van
 *  primero ("US$" antes que "$", "R$" antes que "$"). */
const MONEDAS: { re: RegExp; moneda: Moneda }[] = [
  { re: /\bUS\$|\bUSD\b/i, moneda: 'USD' },
  { re: /\bR\$\s?|\bBRL\b/i, moneda: 'BRL' },
  { re: /\bS\/\.?\s?|\bPEN\b/i, moneda: 'PEN' },
  { re: /€|\bEUR\b/i, moneda: 'EUR' },
  { re: /\bCOP\b/i, moneda: 'COP' },
  { re: /\bMXN\b|\bMX\$/i, moneda: 'MXN' },
  { re: /\bUF\b/i, moneda: 'UF' },
  { re: /\bCLP\b/i, moneda: 'CLP' },
];

/** Detecta la moneda dominante del texto completo. Sin señal → fallback.
 *  El "$" a secas es ambiguo (CLP/MXN/COP/ARS) → se resuelve con el fallback
 *  que inyecta el contexto del negocio (CLP en Chile). */
export function detectarMoneda(texto: string, fallback: Moneda = 'CLP'): Moneda {
  for (const { re, moneda } of MONEDAS) if (re.test(texto)) return moneda;
  return fallback;
}

export interface MontoParseado {
  valor: number;
  /** true si el texto traía parte decimal explícita ("1.234,56"). */
  conDecimales: boolean;
  /** true si traía separadores de miles o símbolo de moneda (señal fuerte de
   *  que ES plata y no un código/cantidad). */
  conSeparador: boolean;
}

/**
 * "1.234.567" → 1234567 · "1,234.56" → 1234.56 · "1.234,56" → 1234.56 ·
 * "$ 1234" → 1234 · "12,50" → 12.5. Devuelve null si no hay número.
 *
 * Regla de desambiguación: el ÚLTIMO separador es decimal si le siguen 1-2
 * dígitos; con 3 dígitos exactos y más de un separador (o el mismo separador
 * repetido) es de miles. "1.234" solo → miles (contexto latam: CLP sin
 * decimales es lo normal; USD ambiguo se corrige en la UI).
 */
export function parseMontoUniversal(s: string): MontoParseado | null {
  const limpio = s.replace(/[^\d.,\-]/g, '');
  const m = limpio.match(/-?\d[\d.,]*/);
  if (!m) return null;
  let t = m[0];
  const negativo = t.startsWith('-');
  if (negativo) t = t.slice(1);

  const conSeparador = /[.,]/.test(t) || /[$€]/.test(s);
  const puntos = (t.match(/\./g) ?? []).length;
  const comas = (t.match(/,/g) ?? []).length;

  let valor: number;
  if (puntos === 0 && comas === 0) {
    valor = Number(t);
  } else {
    const ultimoSep = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
    const sepChar = t[ultimoSep];
    const tras = t.length - ultimoSep - 1;
    const repetido = (sepChar === '.' ? puntos : comas) > 1;
    const hayAmbos = puntos > 0 && comas > 0;
    // Decimal si: hay ambos separadores (el último manda), o al último separador
    // le siguen 1-2 dígitos y no está repetido (repetido = miles: 1.234.567).
    const esDecimal = hayAmbos || (tras >= 1 && tras <= 2 && !repetido);
    if (esDecimal) {
      const entero = t.slice(0, ultimoSep).replace(/[.,]/g, '');
      const dec = t.slice(ultimoSep + 1);
      valor = Number(`${entero}.${dec}`);
    } else {
      valor = Number(t.replace(/[.,]/g, ''));
    }
  }
  if (!Number.isFinite(valor)) return null;
  return { valor: negativo ? -valor : valor, conDecimales: !Number.isInteger(valor), conSeparador };
}

/** Compat CLP: "$1.234.567" / "1.234.567" → 1234567 (entero, sin signo).
 *  Mismo contrato que el parseMonto histórico de factura.ts. */
export function parseMontoCLP(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}

/** Regex de montos en texto libre: con separador (1.234.567 / 1,234.56), con
 *  símbolo ($ 1234, US$ 12.50) o enteros planos de 4-9 dígitos (fotos de
 *  celular pierden el separador de miles). Compartida por los parsers. */
export const MONEY_RE = /(?:US\$|R\$|S\/\.?|MX\$|[$€])\s*\d[\d.,]*|\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b|\b\d+[.,]\d{1,2}\b|\b\d{4,9}\b/g;

/** Redondea a la precisión de la moneda: CLP/COP sin decimales, el resto a 2. */
export function redondearMoneda(valor: number, moneda: Moneda): number {
  if (moneda === 'CLP' || moneda === 'COP') return Math.round(valor);
  return Math.round(valor * 100) / 100;
}
