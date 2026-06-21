/**
 * Extracción de datos de una factura desde el resultado OCR.
 *
 * HEURÍSTICO y BEST-EFFORT: Tesseract devuelve texto plano, no una tabla. Lo que
 * sale de acá es un punto de partida que el usuario SIEMPRE revisa y corrige en la
 * UI antes de guardar. No prometer precisión en facturas de layout complejo.
 */

import type { OCRRaw, FacturaExtraida, ItemFactura, OCREntity } from './types';

/** "$1.234.567" / "1.234.567" → 1234567 (CLP entero). */
function parseMonto(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}

/** "15/01/2024" / "15-01-24" → "2024-01-15". '' si no parsea. */
function fechaISO(s?: string): string {
  if (!s) return '';
  const m = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return '';
  const d = m[1].padStart(2, '0');
  const mo = m[2].padStart(2, '0');
  let y = m[3];
  if (y.length === 2) y = Number(y) > 50 ? `19${y}` : `20${y}`;
  return `${y}-${mo}-${d}`;
}

function first(entities: OCREntity[], label: OCREntity['label']): OCREntity | undefined {
  return entities.find((e) => e.label === label);
}

/** Busca un monto en las líneas que contengan alguna de las palabras dadas. */
function montoEnLineas(lines: { text: string }[], palabras: RegExp, excluir?: RegExp): number {
  let best = 0;
  for (const { text } of lines) {
    if (!palabras.test(text)) continue;
    if (excluir && excluir.test(text)) continue;
    const montos = [...text.matchAll(/\$?\s*\d{1,3}(?:\.\d{3})+|\$\s*\d+/g)].map((m) => parseMonto(m[0]));
    const max = Math.max(0, ...montos);
    if (max > best) best = max;
  }
  return best;
}

function parseItems(lines: { text: string }[]): ItemFactura[] {
  const items: ItemFactura[] = [];
  const saltar = /total|neto|i\.?v\.?a|subtotal|rut|factura|fecha|se[ñn]or|cliente|giro|direcci[oó]n|tel[eé]fono|email|correo/i;
  for (const { text } of lines) {
    if (saltar.test(text)) continue;
    // descripción + cantidad + precio unitario + total (3 números al final)
    const m = text.match(/^(.+?)\s+(\d{1,4})\s+\$?\s*([\d.]{2,})\s+\$?\s*([\d.]{2,})\s*$/);
    if (!m) continue;
    const descripcion = m[1].trim();
    const cantidad = Number(m[2]);
    const precio = parseMonto(m[3]);
    const total = parseMonto(m[4]);
    if (descripcion.length >= 2 && cantidad > 0 && precio > 0 && total > 0) {
      items.push({ descripcion, cantidad, precio, total });
    }
  }
  return items;
}

export function extraerFactura(raw: OCRRaw): FacturaExtraida {
  const { entities, lines, fullText } = raw;

  const rut = first(entities, 'TAX_ID')?.normalized ?? '';
  const razonSocial = first(entities, 'ORGANIZATION')?.text ?? lines[0]?.text.slice(0, 80) ?? '';
  const fecha = fechaISO(first(entities, 'DATE')?.text);

  // Folio / N° de factura
  const folioM = fullText.match(/(?:factura|folio|n[°ºo]\.?)\D{0,6}(\d{2,})/i);
  const folio = folioM?.[1] ?? '';

  // Montos: buscar por palabra clave; si falta, derivar.
  let total = montoEnLineas(lines, /total/i, /sub\s*total/i);
  let neto = montoEnLineas(lines, /neto|afecto/i);
  let iva = montoEnLineas(lines, /i\.?v\.?a/i);

  if (!total) {
    // fallback: el mayor monto del documento
    const montos = entities.filter((e) => e.label === 'MONEY').map((e) => parseMonto(e.text));
    total = Math.max(0, ...montos);
  }
  if (total && !neto && !iva) {
    neto = Math.round(total / 1.19);
    iva = total - neto;
  } else if (!total && neto) {
    total = neto + iva;
  }

  return { rut, razonSocial, folio, fecha, neto, iva, total, items: parseItems(lines) };
}
