/**
 * Clasificador de tipo de documento comercial por heurísticas de texto.
 *
 * NO está atado a un país: las señales son palabras clave en español, portugués
 * e inglés + rasgos estructurales (desglose de impuestos, señales de caja).
 * Devuelve el tipo con mayor puntaje y una confianza relativa (0-1) para que la
 * UI pueda mostrar "parece una boleta" sin prometer certeza.
 */

import type { OCRRaw, TipoDocumento } from './types';

interface Regla {
  re: RegExp;
  peso: number;
}

/** Señales por tipo. El peso alto es para títulos inequívocos; el bajo para
 *  vocabulario que acompaña pero también aparece en otros documentos. */
const REGLAS: Record<Exclude<TipoDocumento, 'otro'>, Regla[]> = {
  nota_credito: [
    // Antes que factura: "nota de crédito electrónica" también contiene "electrónica".
    { re: /nota\s+de\s+cr[eé]dito/i, peso: 10 },
    { re: /credit\s+note/i, peso: 10 },
    { re: /nota\s+de\s+cr[eé]dito\s+electr[oó]nica/i, peso: 4 },
  ],
  factura: [
    { re: /factura\s+electr[oó]nica/i, peso: 8 },
    { re: /\bfactura\b/i, peso: 6 },
    { re: /\binvoice\b/i, peso: 6 },
    { re: /nota\s+fiscal/i, peso: 6 }, // Brasil
    { re: /cr[eé]dito\s+fiscal/i, peso: 3 },
    { re: /\bneto\b[\s\S]{0,80}i\.?v\.?a/i, peso: 2 }, // desglose neto+IVA
    { re: /raz[oó]n\s+social|se[ñn]or\(?es\)?/i, peso: 1 },
  ],
  boleta: [
    { re: /boleta\s+electr[oó]nica/i, peso: 8 },
    { re: /\bboleta\b/i, peso: 6 },
  ],
  ticket: [
    { re: /\bticket\b/i, peso: 5 },
    { re: /\bvuelto\b|\bcambio\b|\bchange\b/i, peso: 3 },
    { re: /\befectivo\b|\bcash\b/i, peso: 2 },
    { re: /\bmesa\b|\bgarz[oó]n\b|\bmozo\b|\bpropina\b|\btip\b/i, peso: 3 }, // restaurante
    { re: /\bcajero?a?\b|\bcaja\s*n?[°º]?\s*\d/i, peso: 2 },
    { re: /gracias\s+por\s+su\s+(?:compra|preferencia|visita)/i, peso: 2 },
  ],
  guia: [
    { re: /gu[ií]a\s+de\s+despacho/i, peso: 10 },
    { re: /\bremisi[oó]n\b|\bremito\b/i, peso: 8 },
    { re: /delivery\s+note|packing\s+(?:list|slip)/i, peso: 6 },
    { re: /\btraslado\b/i, peso: 2 },
  ],
  presupuesto: [
    { re: /\bpresupuesto\b/i, peso: 8 },
    { re: /\bproforma\b/i, peso: 6 },
    { re: /validez\s+(?:de\s+la\s+)?(?:oferta|presupuesto)/i, peso: 3 },
  ],
  cotizacion: [
    { re: /cotizaci[oó]n/i, peso: 8 },
    { re: /\bquotation\b|\bquote\b/i, peso: 6 },
    { re: /or[çc]amento/i, peso: 6 }, // Brasil
  ],
  recibo: [
    { re: /\brecibo\b|\breceipt\b/i, peso: 6 },
    { re: /recib[ií]\s+de|pago\s+recibido/i, peso: 5 },
    { re: /comprobante\s+de\s+pago/i, peso: 5 },
    { re: /\barriendo\b|\balquiler\b|\brenta\s+mensual\b/i, peso: 2 }, // recibos de arriendo
  ],
};

export interface Clasificacion {
  tipo: TipoDocumento;
  /** 0-1: puntaje del ganador relativo al total (qué tan despejada fue la
   *  votación). 0 si ningún tipo sumó señales. */
  confianza: number;
}

/**
 * Clasifica el documento. Las señales dentro del primer tercio del texto pesan
 * doble: el tipo de documento casi siempre está en el encabezado ("FACTURA
 * ELECTRÓNICA N° …"), mientras que menciones tardías suelen ser prosa legal.
 */
export function clasificarDocumento(raw: OCRRaw): Clasificacion {
  const texto = raw.fullText;
  if (!texto.trim()) return { tipo: 'otro', confianza: 0 };
  const corteCabecera = Math.floor(texto.length / 3);

  const puntajes = new Map<TipoDocumento, number>();
  for (const [tipo, reglas] of Object.entries(REGLAS) as [TipoDocumento, Regla[]][]) {
    let p = 0;
    for (const { re, peso } of reglas) {
      const m = texto.match(re);
      if (!m) continue;
      p += (m.index ?? texto.length) < corteCabecera ? peso * 2 : peso;
    }
    if (p > 0) puntajes.set(tipo, p);
  }
  if (puntajes.size === 0) return { tipo: 'otro', confianza: 0 };

  let ganador: TipoDocumento = 'otro';
  let mejor = 0;
  let total = 0;
  for (const [tipo, p] of puntajes) {
    total += p;
    if (p > mejor) {
      mejor = p;
      ganador = tipo;
    }
  }
  // Confianza: fracción del puntaje total + bonus por puntaje absoluto alto
  // (un título inequívoco en cabecera da ≥12). Techo 0.95: esto es heurístico.
  const relativa = mejor / total;
  const absoluta = Math.min(1, mejor / 12);
  return { tipo: ganador, confianza: Math.min(0.95, relativa * 0.6 + absoluta * 0.4) };
}
