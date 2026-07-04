/**
 * Motor OCR 100% client-side con Tesseract.js.
 *
 * Corre en el navegador, sin servidor (evita el timeout de Vercel). El modelo de
 * idioma (~8MB spa+eng) se descarga una vez y queda cacheado en el browser.
 * Importación dinámica → nunca corre en el servidor. Tesseract.js ya ejecuta el
 * reconocimiento en su propio Web Worker (la UI no se bloquea).
 *
 * v2: corre OCR sobre las variantes de preprocesado (contraste / Sauvola)
 * reutilizando el mismo worker y se queda con la de mayor confidence (corte
 * temprano si la primera ya es buena). Pide `blocks` para obtener palabras con
 * coordenadas — la base del layout/columnas del parser. Entidades multi-país.
 */

import type { OCRProgress, OCRLine, OCREntity, OCRRaw, OCRWord } from './types';
import { generarVariantes } from './preprocess';

// ─── Extracción de entidades (multi-país) ─────────────────────────────────────

function normalizarRut(raw: string): string {
  const limpio = raw.replace(/\s/g, '');
  const digits = limpio.replace(/[.\-–kK]/g, '');
  if (limpio.includes('.') || digits.length < 7) return limpio;
  const body = digits.slice(0, -1);
  const dv = limpio.slice(-1);
  if (body.length === 8) return `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5)}-${dv}`;
  if (body.length === 7) return `${body.slice(0, 1)}.${body.slice(1, 4)}.${body.slice(4)}-${dv}`;
  return limpio;
}

function extractEntities(text: string): OCREntity[] {
  const entities: OCREntity[] = [];
  const seen = new Set<string>();
  const add = (label: OCREntity['label'], t: string, normalized?: string, pais?: string) => {
    const key = `${label}:${t}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ label, text: t, normalized, pais });
    }
  };

  // ── Identificadores tributarios por país ────────────────────────────────
  // RUT chileno: 12.345.678-9 / 12345678-9 / 1.234.567-K / "96.570.750 - 6"
  // (con espacios alrededor del guion, frecuente en facturas escaneadas).
  // Va primero: el flujo actual (compras Chile) toma el primer TAX_ID.
  for (const m of text.matchAll(/\b\d{1,2}\.?\d{3}\.?\d{3}\s*[-–]\s*[\dkK]\b/g)) {
    const raw = m[0].replace(/\s/g, '');
    add('TAX_ID', raw, normalizarRut(raw), 'CL');
  }
  // CNPJ brasileño: 12.345.678/0001-90 (el /0001 lo distingue de todo lo demás).
  for (const m of text.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/g))
    add('TAX_ID', m[0], m[0], 'BR');
  // CPF brasileño: 123.456.789-01 (dos dígitos verificadores; el RUT tiene uno).
  for (const m of text.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g))
    add('TAX_ID', m[0], m[0], 'BR');
  // RFC mexicano: 3-4 letras + fecha AAMMDD + homoclave (persona moral/física).
  for (const m of text.matchAll(/\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/g))
    add('TAX_ID', m[0], m[0], 'MX');
  // RUC peruano: 11 dígitos que parten con 10/15/17/20. Exigir la etiqueta RUC
  // cerca: 11 dígitos sueltos aparecen en folios y códigos de barra.
  for (const m of text.matchAll(/\bRUC\s*:?\s*((?:10|15|17|20)\d{9})\b/gi))
    add('TAX_ID', m[1], m[1], 'PE');
  // NIT colombiano: etiquetado (NIT 900.123.456-7). Sin etiqueta se confunde
  // con montos → solo con la etiqueta.
  for (const m of text.matchAll(/\bNIT\.?\s*:?\s*([\d.]{7,15}(?:\s*-\s*\d)?)\b/gi))
    add('TAX_ID', m[1].replace(/\s/g, ''), m[1].replace(/\s/g, ''), 'CO');
  // Genérico: TAX ID / VAT / NIF / CIF etiquetado, para cualquier otro país.
  for (const m of text.matchAll(/\b(?:TAX\s*ID|VAT|NIF|CIF)\s*(?:N[°ºo.]*)?\s*:?\s*([A-Z0-9][A-Z0-9.\-/]{4,18})\b/gi))
    add('TAX_ID', m[1], m[1]);

  // Email
  for (const m of text.matchAll(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g))
    add('EMAIL', m[0]);
  // Teléfono chileno (compat) + genérico internacional con prefijo +XX.
  for (const m of text.matchAll(/(?:\+?56\s*)?(?:9\s?\d{4}\s?\d{4}|\(2\)\s?\d{4}\s?\d{4})/g)) {
    const p = m[0].trim();
    if (p.replace(/\D/g, '').length >= 8) add('PHONE', p);
  }
  for (const m of text.matchAll(/\+\d{1,3}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4}){2,3}/g)) {
    const p = m[0].trim();
    if (p.replace(/\D/g, '').length >= 8) add('PHONE', p);
  }
  // Fecha dd/mm/yyyy (o mm/dd — la desambigua el parser) e yyyy-mm-dd.
  for (const m of text.matchAll(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g)) add('DATE', m[0]);
  for (const m of text.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) add('DATE', m[0]);
  // Fecha escrita en español y portugués ("22 de janeiro de 2024").
  for (const m of text.matchAll(
    /\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|janeiro|fevereiro|março|marco|maio|junho|julho|setembro|outubro|dezembro)\s+(?:del?\s+)?\d{4}\b/gi
  ))
    add('DATE', m[0]);
  // Montos: $1.234.567 / US$ 12.50 / 1.234,56 / enteros con separador de miles.
  for (const m of text.matchAll(/(?:US\$|R\$|S\/\.?|MX\$|[$€])\s*[\d.,]+|\b\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\b|\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/g)) {
    const val = m[0].trim();
    if (val.replace(/\D/g, '').length >= 3) add('MONEY', val);
  }
  // Organización: nombre + sufijo societario multi-país.
  for (const m of text.matchAll(
    /[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s.]{3,}(?:SpA|Ltda\.?|S\.A\.?(?:\s*de\s*C\.?V\.?)?|EIRL|E\.I\.R\.L\.?|S\.p\.A\.?|S\.A\.S\.?|SAS|S\.R\.L\.?|SRL|S\.A\.C\.?|Inc\.?|LLC|GmbH)/g
  )) {
    const org = m[0].trim();
    if (org.split(' ').length >= 2) add('ORGANIZATION', org);
  }

  return entities;
}

// ─── Lectura de blocks de Tesseract (palabras con coordenadas) ───────────────

interface TesseractBBox { x0: number; y0: number; x1: number; y1: number }
interface TesseractWord { text: string; confidence: number; bbox: TesseractBBox }
interface TesseractLine { text: string; confidence: number; bbox: TesseractBBox; words?: TesseractWord[] }
interface TesseractParagraph { lines?: TesseractLine[] }
interface TesseractBlock { paragraphs?: TesseractParagraph[] }

/** Aplana blocks → líneas con palabras/bbox. Devuelve [] si no vinieron blocks
 *  (versiones/builds sin soporte) — el caller cae al texto plano. */
function lineasDesdeBlocks(blocks: TesseractBlock[] | null | undefined): OCRLine[] {
  if (!blocks?.length) return [];
  const lines: OCRLine[] = [];
  for (const b of blocks) {
    for (const p of b.paragraphs ?? []) {
      for (const l of p.lines ?? []) {
        const words: OCRWord[] = (l.words ?? [])
          .filter((w) => w.text.trim().length > 0)
          .map((w) => ({ text: w.text.trim(), confidence: (w.confidence ?? 0) / 100, bbox: w.bbox }));
        const text = l.text.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        lines.push({ text, confidence: (l.confidence ?? 0) / 100, bbox: l.bbox, words: words.length ? words : undefined });
      }
    }
  }
  return lines;
}

// ─── OCR en el navegador ───────────────────────────────────────────────────────

interface ResultadoVariante {
  fullText: string;
  lines: OCRLine[];
  avgConfidence: number;
  nombre: string;
}

/** Confianza sobre la cual NO vale la pena probar otra variante (el OCR extra
 *  duplica el tiempo de espera en el teléfono para ganar poco). */
const CONF_SUFICIENTE = 0.82;

export async function runOCRInBrowser(
  file: File,
  onProgress?: (p: OCRProgress) => void
): Promise<OCRRaw> {
  onProgress?.({ step: 'loading', message: 'Preparando la imagen…', percent: 3 });
  // Variantes de preprocesado (perspectiva + deskew + contraste/Sauvola).
  // Best-effort: si el preprocesado falla, la única variante es el original.
  const variantes = await generarVariantes(file);

  onProgress?.({ step: 'loading', message: 'Inicializando motor OCR…', percent: 5 });

  const { createWorker } = await import('tesseract.js');
  // El rango 50-85 del progreso se reparte entre las variantes que se corran.
  let varianteActual = 0;
  let totalVariantes = variantes.length;
  const worker = await createWorker(['spa', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading language traineddata') {
        onProgress?.({
          step: 'loading',
          message: `Cargando idioma… ${Math.round(m.progress * 100)}%`,
          percent: 10 + Math.round(m.progress * 40),
        });
      } else if (m.status === 'recognizing text') {
        const ancho = 35 / totalVariantes;
        onProgress?.({
          step: 'ocr',
          message:
            totalVariantes > 1
              ? `Reconociendo texto (pasada ${varianteActual + 1}/${totalVariantes})… ${Math.round(m.progress * 100)}%`
              : `Reconociendo texto… ${Math.round(m.progress * 100)}%`,
          percent: 50 + Math.round(varianteActual * ancho + m.progress * ancho),
        });
      }
    },
  });

  let mejor: ResultadoVariante | null = null;
  try {
    for (let i = 0; i < variantes.length; i++) {
      varianteActual = i;
      const v = variantes[i];
      // `blocks: true` → palabras con coordenadas (Tesseract.js v5+ solo trae
      // data.text por defecto). Cast local: los tipos publicados no declaran
      // el tercer parámetro de salida en todas las versiones.
      const { data } = await (worker.recognize as (
        img: Blob,
        opts?: Record<string, unknown>,
        output?: Record<string, boolean>
      ) => Promise<{ data: { text?: string; confidence?: number; blocks?: TesseractBlock[] } }>)(
        v.blob,
        {},
        { text: true, blocks: true }
      );

      const fullText = data.text || '';
      const avgConfidence = (data.confidence || 0) / 100;
      // Preferir líneas con coordenadas; fallback al texto plano (los saltos de
      // línea de data.text son lo que el parser de cabecera/ítems necesita).
      let lines = lineasDesdeBlocks(data.blocks);
      if (!lines.length) {
        lines = fullText
          .split('\n')
          .map((t) => ({ text: t.replace(/\s+/g, ' ').trim(), confidence: avgConfidence }))
          .filter((l) => l.text.length > 0);
      }

      const res: ResultadoVariante = { fullText, lines, avgConfidence, nombre: v.nombre };
      if (!mejor || res.avgConfidence > mejor.avgConfidence) mejor = res;
      // Corte temprano: si esta variante ya leyó bien, no quemar tiempo en otra.
      if (mejor.avgConfidence >= CONF_SUFICIENTE) {
        totalVariantes = i + 1;
        break;
      }
    }
  } finally {
    await worker.terminate();
  }

  onProgress?.({ step: 'analyzing', message: 'Extrayendo datos…', percent: 90 });
  const fullText = mejor?.fullText ?? '';
  const entities = extractEntities(fullText);
  onProgress?.({ step: 'done', message: 'Listo', percent: 100 });

  return {
    fullText,
    lines: mejor?.lines ?? [],
    entities,
    avgConfidence: mejor?.avgConfidence ?? 0,
    variante: mejor?.nombre,
  };
}
