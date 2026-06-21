/**
 * Extracción de datos de una factura desde el resultado OCR.
 *
 * HEURÍSTICO y BEST-EFFORT: Tesseract devuelve texto plano, no una tabla. Lo que
 * sale de acá es un punto de partida que el usuario SIEMPRE revisa y corrige en la
 * UI antes de guardar. No prometer precisión en facturas de layout complejo.
 */

import type { OCRRaw, FacturaExtraida, ItemFactura, OCREntity, TipoDocOCR } from './types';

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

// Un RUT (99.554.560-8) "parece" un monto grande → hay que sacarlo antes de
// extraer montos, o se cuela como total/neto. También se quitan el folio y las
// fechas (que tampoco son plata).
const RUT_RE = /\d{1,2}\.\d{3}\.\d{3}\s*-?\s*[\dkK]\b/g;
const DATE_RE = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g;
// Acepta montos CON separador (30.000) o con $, Y enteros PLANOS de ≥4 dígitos:
// las fotos de celular a menudo pierden el separador de miles (lee "35700").
const MONEY_RE = /\$?\s*\d{1,3}(?:[.,]\d{3})+|\$\s*\d+|\b\d{4,9}\b/g;

function quitarNoMontos(text: string, folio?: string): string {
  let t = text.replace(RUT_RE, ' ').replace(DATE_RE, ' ');
  if (folio && folio.length >= 4) t = t.split(folio).join(' ');
  return t;
}

/** Montos de un texto (sin RUT/folio/fecha). Separados ≥100; planos ≥1000 (para
 *  no confundir cantidades/porcentajes con plata cuando NO hay etiqueta cerca). */
function montosDeTexto(text: string, folio?: string): number[] {
  const out: number[] = [];
  for (const m of quitarNoMontos(text, folio).matchAll(MONEY_RE)) {
    const v = parseMonto(m[0]);
    const conSeparador = /[.,$]/.test(m[0]);
    if (conSeparador ? v >= 100 : v >= 1000) out.push(v);
  }
  return out;
}

/** Mayor monto en líneas que contengan `palabras` (y no `excluir`). */
function montoEnLineas(lines: { text: string }[], palabras: RegExp, excluir: RegExp | undefined, folio: string): number {
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
function montoTrasEtiqueta(lines: { text: string }[], etiqueta: RegExp, folio: string): number {
  for (const { text } of lines) {
    const t = quitarNoMontos(text, folio);
    const m = t.match(etiqueta);
    if (!m) continue;
    // Primer número ≥100 tras la etiqueta (acepta plano: la etiqueta lo ancla, así
    // que un entero sin separador pegado a "TOTAL"/"NETO" es válido). Salta la tasa
    // ("IVA 19% 5.700" → ignora 19, toma 5.700).
    const resto = t.slice((m.index ?? 0) + m[0].length);
    for (const nm of resto.matchAll(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{2,9})/g)) {
      const v = parseMonto(nm[1]);
      if (v >= 100) return v;
    }
  }
  return 0;
}

// ── Monto escrito en palabras ("SON: CIENTO QUINCE MIL PESOS") ───────────────
// Señal MUY robusta: las palabras no pierden separadores de miles ni se confunden
// con códigos de producto, a diferencia de los números cuando el OCR es pobre.
// Las facturas chilenas casi siempre traen "SON: … PESOS"; este soporte de Coca-Cola
// trae "CIENTO QUINCE MIL PESOS". Sirve para recuperar el total cuando el OCR perdió
// la cifra (acá la caja "VALOR TOTAL" no quedó en el texto).
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
function palabrasANumero(texto: string): number {
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
function montoEnLetra(lines: { text: string }[]): number {
  for (const { text } of lines) {
    const norm = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const idx = norm.indexOf('peso');
    if (idx < 0) continue;
    const n = palabrasANumero(norm.slice(0, idx));
    if (n >= 1000) return n;
  }
  return 0;
}

/** Mayor monto del bloque dado, ignorando la línea del RUT. Fallback del total. */
function maxMonto(lines: { text: string }[], folio: string): number {
  let best = 0;
  for (const { text } of lines) {
    if (/rut/i.test(text)) continue;
    for (const v of montosDeTexto(text, folio)) if (v > best) best = v;
  }
  return best;
}

/**
 * Ítems de línea (best-effort). Tesseract da texto plano, no tabla → heurística:
 * por cada línea con una descripción a la izquierda y ≥2 números al final, toma
 * el último como total, el anterior como precio unitario y un entero corto como
 * cantidad. Más recall que el regex estricto anterior (que exigía exactamente
 * "desc cant precio total"). Siempre editable; el usuario borra los falsos.
 */
function parseItems(lines: { text: string }[]): ItemFactura[] {
  const items: ItemFactura[] = [];
  const saltar =
    /total|neto|i\.?v\.?a|sub\s*-?\s*total|rut|n[°ºo]\s*factura|fecha|se[ñn]or|cliente|giro|direcci[oó]n|tel[eé]fono|email|correo|importe|c[oó]digo|descripci[oó]n|cantidad|precio|unitario|p[aá]gina|despacho|consecutivo|ruta/i;

  const esMonto = (t: string) =>
    /^\d{1,3}(?:\.\d{3})+$/.test(t) || /^\d+$/.test(t) || /^\d+,\d+$/.test(t);
  const esEnteroCorto = (t: string) => /^\d+$/.test(t) && Number(t) > 0 && Number(t) < 1000;

  for (const { text } of lines) {
    const linea = text.trim();
    if (linea.length < 5 || saltar.test(linea)) continue;

    const tokens = linea.split(/\s+/).map((t) => t.replace(/^\$/, ''));
    // La descripción puede tener números (250X12, 1.5LT) → no parto en el primer
    // número, sino que aíslo la COLA de montos al final de la línea.
    let i = tokens.length;
    while (i > 0 && esMonto(tokens[i - 1])) i--;
    const cola = tokens.slice(i);
    if (cola.length < 2) continue; // necesita al menos cantidad/precio + total

    // Descripción = lo de antes de la cola, sin los códigos de posición iniciales.
    const head = [...tokens.slice(0, i)];
    while (head.length && /^\d+$/.test(head[0])) head.shift();
    const descripcion = head.join(' ').trim();
    if (descripcion.length < 3) continue;

    const montos = cola.map(parseMonto);
    const total = montos[montos.length - 1];
    if (!(total > 0)) continue;

    let cantidad = 1;
    let precio = total;
    if (cola.length === 2) {
      // [cantidad, total] si el primero es entero chico; si no [precio, total].
      if (esEnteroCorto(cola[0])) {
        cantidad = montos[0];
        precio = cantidad > 0 ? Math.round(total / cantidad) : total;
      } else {
        precio = montos[0];
      }
    } else {
      precio = montos[montos.length - 2] || total;
      const idx = cola.slice(0, -1).findIndex(esEnteroCorto);
      cantidad = idx >= 0 ? montos[idx] : 1;
    }
    if (!(cantidad > 0)) cantidad = 1;

    items.push({ descripcion: descripcion.slice(0, 120), cantidad, precio, total });
    if (items.length >= 60) break; // techo de seguridad
  }
  return items;
}

export function extraerFactura(raw: OCRRaw, tipo: TipoDocOCR = 'factura'): FacturaExtraida {
  const { entities, lines, fullText } = raw;

  const rut = first(entities, 'TAX_ID')?.normalized ?? '';
  const razonSocial = first(entities, 'ORGANIZATION')?.text ?? lines[0]?.text.slice(0, 80) ?? '';
  const fecha = fechaISO(first(entities, 'DATE')?.text);

  // Folio / N° de factura. OJO: el "factura" suelto agarraba "TOTAL FACTURA 11881"
  // (el total) como folio → exigir un marcador de número (N°/Nº/No/Nro/Folio/#),
  // o "factura N°". Sin marcador legible, mejor folio vacío que tomar el total.
  const folioM = fullText.match(
    /(?:folio|nro\.?|n[°ºo]\.?|#|factura\s*(?:electr[oó]nica\s*)?n[°ºo]\.?)\s*[:.\-]?\s*(\d{3,})/i
  );
  const folio = folioM?.[1] ?? '';

  // Ítems primero: su suma es un candidato a total (y un cross-check del cuadre).
  const items = parseItems(lines);
  const sumaItems = items.reduce((a, it) => a + (it.total || 0), 0);

  // ── Montos ──────────────────────────────────────────────────────────────
  // Los totales SIEMPRE van en la parte FINAL de la hoja → priorizar la zona
  // inferior (evita confundir el folio/RUT de arriba o los precios unitarios
  // del medio con el total). Etiqueta→valor pegado (no el máximo de la línea).
  const corte = Math.floor(lines.length * 0.45);
  const abajo = lines.length > 6 ? lines.slice(corte) : lines;

  const lblTotal =
    /(?:monto|valor)\s*total|total\s*(?:factura|a\s*pagar|final|general|adeudado)|invoice\s*total|total\s*de\s*factura/i;
  const exclTotal =
    /neto|i\.?v\.?a|sub\s*-?\s*total|exento|afecto|descuento|anticipo|garant[ií]a|env\s*ase|unitari|precio/i;

  // Etiquetas fuertes primero (los 4 docs chilenos resuelven acá → sin regresión).
  // Si fallan, el monto-en-letra y la suma de ítems son mejores que "el mayor
  // número de la hoja" (que agarra códigos de material, como el 135760 de Coca-Cola).
  let total =
    montoTrasEtiqueta(abajo, lblTotal, folio) ||
    montoTrasEtiqueta(lines, lblTotal, folio) ||
    montoEnLineas(abajo, /total/i, exclTotal, folio) ||
    montoEnLineas(lines, /total/i, exclTotal, folio) ||
    montoEnLetra(lines) ||
    (sumaItems >= 1000 ? sumaItems : 0) ||
    maxMonto(abajo, folio);
  let neto =
    montoTrasEtiqueta(abajo, /\bneto\b|afecto/i, folio) ||
    montoTrasEtiqueta(lines, /\bneto\b|afecto/i, folio);
  let iva =
    montoTrasEtiqueta(abajo, /i\.?v\.?a(?!\s*adicional)/i, folio) ||
    montoTrasEtiqueta(lines, /i\.?v\.?a(?!\s*adicional)/i, folio);

  if (total && !neto && !iva) {
    neto = Math.round(total / 1.19);
    iva = total - neto;
  } else if (!total && neto) {
    total = neto + iva;
  }

  // Boletas/guías/otros normalmente NO desglosan neto/IVA: si solo hay total
  // (o el desglose detectado no cuadra), derivar asumiendo 19% (editable).
  if (tipo !== 'factura' && total && (!neto || !iva || Math.abs(neto + iva - total) > 2)) {
    neto = Math.round(total / 1.19);
    iva = total - neto;
  }

  return { rut, razonSocial, folio, fecha, neto, iva, total, items };
}
