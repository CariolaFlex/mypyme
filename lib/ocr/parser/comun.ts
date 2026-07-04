/**
 * Helpers compartidos por las estrategias del DocumentParser.
 *
 * La mayoría viene VERBATIM del parser histórico de facturas chilenas
 * (lib/ocr/factura.ts) — se movieron acá para que tickets/recibos/presupuestos
 * los reutilicen sin duplicar. Cambiarlos afecta la retrocompatibilidad de las
 * facturas que hoy funcionan: tocar con cuidado.
 */

import type { OCREntity } from '../types';

/** "$1.234.567" / "1.234.567" → 1234567 (CLP entero). */
export function parseMonto(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}

const MESES: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

/** "15/01/2024" / "15.01.24" / "22 de Enero del 2024" → "2024-01-15". '' si no parsea. */
export function fechaISO(s?: string): string {
  if (!s) return '';
  // ISO ya listo (yyyy-mm-dd).
  const iso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  // Numérica: dd/mm/yyyy · dd-mm-yy · dd.mm.yyyy
  const m = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    let y = m[3];
    if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
    return `${y}-${mo}-${d}`;
  }
  // Escrita: "22 de Enero del 2024" · "01 de octubre de 2009" (DTE chilenas).
  const w = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:del?\s+)?(\d{4})/);
  if (w && MESES[w[2]]) return `${w[3]}-${MESES[w[2]]}-${w[1].padStart(2, '0')}`;
  return '';
}

/** Fecha de EMISIÓN: prioriza la fecha pegada a una etiqueta de emisión/factura
 *  (evita tomar fechas de tránsito/vigencia/vencimiento), luego la 1ª fecha del doc. */
export function fechaDocumento(lines: { text: string }[], entities: OCREntity[]): string {
  const lbl = /fecha\s*(?:de\s*)?(?:emisi[oó]n|factura|documento)|emisi[oó]n/i;
  for (const { text } of lines) {
    const m = text.match(lbl);
    if (!m) continue;
    const f = fechaISO(text.slice(m.index ?? 0));
    if (f) return f;
  }
  for (const e of entities) if (e.label === 'DATE') {
    const f = fechaISO(e.text);
    if (f) return f;
  }
  return '';
}

export function first(entities: OCREntity[], label: OCREntity['label']): OCREntity | undefined {
  return entities.find((e) => e.label === label);
}

// Un RUT (99.554.560-8) "parece" un monto grande → hay que sacarlo antes de
// extraer montos, o se cuela como total/neto. También se quitan el folio y las
// fechas (que tampoco son plata).
const RUT_RE = /\d{1,2}\.\d{3}\.\d{3}\s*-?\s*[\dkK]\b/g;
const DATE_RE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g;
// Acepta montos CON separador (30.000) o con $, Y enteros PLANOS de ≥4 dígitos:
// las fotos de celular a menudo pierden el separador de miles (lee "35700").
const MONEY_RE = /\$?\s*\d{1,3}(?:[.,]\d{3})+|\$\s*\d+|\b\d{4,9}\b/g;

export function quitarNoMontos(text: string, folio?: string): string {
  let t = text.replace(RUT_RE, ' ').replace(DATE_RE, ' ');
  if (folio && folio.length >= 4) t = t.split(folio).join(' ');
  return t;
}

/** Montos de un texto (sin RUT/folio/fecha). Separados ≥100; planos ≥1000 (para
 *  no confundir cantidades/porcentajes con plata cuando NO hay etiqueta cerca). */
export function montosDeTexto(text: string, folio?: string): number[] {
  const out: number[] = [];
  for (const m of quitarNoMontos(text, folio).matchAll(MONEY_RE)) {
    const v = parseMonto(m[0]);
    const conSeparador = /[.,$]/.test(m[0]);
    if (conSeparador ? v >= 100 : v >= 1000) out.push(v);
  }
  return out;
}

/** Mayor monto en líneas que contengan `palabras` (y no `excluir`). */
export function montoEnLineas(
  lines: { text: string }[],
  palabras: RegExp,
  excluir: RegExp | undefined,
  folio: string
): number {
  let best = 0;
  for (const { text } of lines) {
    if (!palabras.test(text)) continue;
    if (excluir && excluir.test(text)) continue;
    const max = Math.max(0, ...montosDeTexto(text, folio));
    if (max > best) best = max;
  }
  return best;
}

/**
 * Primer monto que aparece JUSTO DESPUÉS de la etiqueta en la línea. Clave para
 * facturas donde el OCR junta "TOTAL NETO 9.146 IVA 1.646 …" en una sola línea:
 * tomar el máximo de la línea (montoEnLineas) confundiría neto con iva, pero el
 * valor pegado a cada etiqueta sí es el correcto.
 */
export function montoTrasEtiqueta(lines: { text: string }[], etiqueta: RegExp, folio: string): number {
  for (const { text } of lines) {
    const t = quitarNoMontos(text, folio);
    const m = t.match(etiqueta);
    if (!m) continue;
    // Primer número ≥100 tras la etiqueta (acepta plano: la etiqueta lo ancla, así
    // que un entero sin separador pegado a "TOTAL"/"NETO" es válido). Salta la tasa
    // ("IVA 19% 5.700" → ignora 19, toma 5.700).
    const resto = t.slice((m.index ?? 0) + m[0].length);
    // [.,\s] como separador de miles: algunas facturas pierden el punto y el OCR
    // deja un espacio ("TOTAL FACTURA 11 901" → 11901). Anclado a la etiqueta, así
    // que es seguro (no merge-ea números sueltos del resto de la hoja).
    for (const nm of resto.matchAll(/\$?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d{2,9})/g)) {
      const v = parseMonto(nm[1]);
      if (v >= 100) return v;
    }
  }
  return 0;
}

// ── Monto escrito en palabras ("SON: CIENTO QUINCE MIL PESOS") ───────────────
// Señal MUY robusta: las palabras no pierden separadores de miles ni se confunden
// con códigos de producto, a diferencia de los números cuando el OCR es pobre.
const NUM_PALABRA: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiun: 21, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
  noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700,
  ochocientos: 800, novecientos: 900,
};

/** "ciento quince mil" → 115000. 0 si no hay palabras-número. */
export function palabrasANumero(texto: string): number {
  const words = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let total = 0;
  let chunk = 0;
  let vistos = false;
  for (const w of words) {
    if (w === 'y') continue;
    if (w === 'mil') { chunk = (chunk || 1) * 1000; total += chunk; chunk = 0; vistos = true; continue; }
    if (w === 'millon' || w === 'millones') { chunk = (chunk || 1) * 1_000_000; total += chunk; chunk = 0; vistos = true; continue; }
    const v = NUM_PALABRA[w];
    if (v !== undefined) { chunk += v; vistos = true; }
    // palabras desconocidas se ignoran (toleran "SON", "IMPORTE", "PESOS", prosa)
  }
  return vistos ? total + chunk : 0;
}

/** Primer monto-en-letra antes de "PESOS" en alguna línea. ≥1000 para evitar
 *  falsos positivos ("un", "dos" sueltos en prosa). */
export function montoEnLetra(lines: { text: string }[]): number {
  for (const { text } of lines) {
    const norm = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const idx = norm.indexOf('peso');
    if (idx < 0) continue;
    const n = palabrasANumero(norm.slice(0, idx));
    if (n >= 1000) return n;
  }
  return 0;
}

/** Mayor monto del bloque dado, ignorando líneas que NO son plata: RUT, números de
 *  cuenta/banco, teléfono/fax, folios con N°. Fallback del total (último recurso). */
export function maxMonto(lines: { text: string }[], folio: string): number {
  const noEsPlata =
    /rut|banco|scotiabank|cta\.?\s*cte|cuenta|dep[oó]sito|transferencia|fono|tel[eé]fono|fax|n[°º*]\s*[:.\-]?\s*\d/i;
  let best = 0;
  for (const { text } of lines) {
    if (noEsPlata.test(text)) continue;
    for (const m of quitarNoMontos(text, folio).matchAll(MONEY_RE)) {
      const v = parseMonto(m[0]);
      const conSeparador = /[.,$]/.test(m[0]);
      // Un entero PLANO en rango de año (1900–2099) casi siempre es un año
      // ("MAYO 2022"), no plata: un total chico real viene con separador
      // ("2.022") o $. Solo en este último recurso → no inventar un año como total.
      if (!conSeparador && v >= 1900 && v <= 2099) continue;
      if (conSeparador ? v >= 100 : v >= 1000) { if (v > best) best = v; }
    }
  }
  return best;
}
