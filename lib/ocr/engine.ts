/**
 * Motor OCR 100% client-side con Tesseract.js (adaptado de LegisEnterprise).
 *
 * Corre en el navegador, sin servidor (evita el timeout de Vercel). El modelo de
 * idioma (~8MB spa+eng) se descarga una vez y queda cacheado en el browser.
 * Importación dinámica → nunca corre en el servidor.
 */

import type { OCRProgress, OCRLine, OCREntity, OCRRaw } from './types';
import { preprocesarImagen } from './preprocess';

// ─── Extracción de entidades (Chile) ──────────────────────────────────────────

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
  const add = (label: OCREntity['label'], t: string, normalized?: string) => {
    const key = `${label}:${t}`;
    if (!seen.has(key)) {
      seen.add(key);
      entities.push({ label, text: t, normalized });
    }
  };

  // RUT: 12.345.678-9 / 12345678-9 / 1.234.567-K
  for (const m of text.matchAll(/\b\d{1,2}\.?\d{3}\.?\d{3}[-–]\s*[\dkK]\b/g)) {
    const raw = m[0].replace(/\s/g, '');
    add('TAX_ID', raw, normalizarRut(raw));
  }
  // Email
  for (const m of text.matchAll(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g))
    add('EMAIL', m[0]);
  // Teléfono chileno
  for (const m of text.matchAll(/(?:\+?56\s*)?(?:9\s?\d{4}\s?\d{4}|\(2\)\s?\d{4}\s?\d{4})/g)) {
    const p = m[0].trim();
    if (p.replace(/\D/g, '').length >= 8) add('PHONE', p);
  }
  // Fecha dd/mm/yyyy
  for (const m of text.matchAll(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g)) add('DATE', m[0]);
  // Fecha escrita
  for (const m of text.matchAll(
    /\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?\d{4}\b/gi
  ))
    add('DATE', m[0]);
  // Montos $1.234.567 / CLP
  for (const m of text.matchAll(/\$\s*[\d.]+|\b\d{1,3}(?:\.\d{3})+\b/g)) {
    const val = m[0].trim();
    if (val.replace(/\D/g, '').length >= 3) add('MONEY', val);
  }
  // Organización: nombre + SpA / Ltda / S.A. / EIRL
  for (const m of text.matchAll(
    /[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s.]{3,}(?:SpA|Ltda\.?|S\.A\.?|EIRL|S\.p\.A\.?)/g
  )) {
    const org = m[0].trim();
    if (org.split(' ').length >= 2) add('ORGANIZATION', org);
  }

  return entities;
}

// ─── OCR en el navegador ───────────────────────────────────────────────────────

export async function runOCRInBrowser(
  file: File,
  onProgress?: (p: OCRProgress) => void
): Promise<OCRRaw> {
  onProgress?.({ step: 'loading', message: 'Preparando la imagen…', percent: 3 });
  // Preprocesa (gris + contraste + upscale) para subir la precisión. Best-effort:
  // si falla, sigue con el archivo original.
  const entrada = await preprocesarImagen(file);

  onProgress?.({ step: 'loading', message: 'Inicializando motor OCR…', percent: 5 });

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['spa', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'loading language traineddata') {
        onProgress?.({
          step: 'loading',
          message: `Cargando idioma… ${Math.round(m.progress * 100)}%`,
          percent: 10 + Math.round(m.progress * 40),
        });
      } else if (m.status === 'recognizing text') {
        onProgress?.({
          step: 'ocr',
          message: `Reconociendo texto… ${Math.round(m.progress * 100)}%`,
          percent: 50 + Math.round(m.progress * 35),
        });
      }
    },
  });

  let fullText = '';
  let lines: OCRLine[] = [];
  let avgConfidence = 0;
  try {
    const { data } = await worker.recognize(entrada);
    fullText = data.text || '';
    avgConfidence = (data.confidence || 0) / 100;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines = ((data as any).lines || [])
      .filter((l: { text: string }) => l.text.trim().length > 0)
      .map((l: { text: string; confidence?: number }) => ({
        text: l.text.replace(/\n/g, ' ').trim(),
        confidence: (l.confidence || 0) / 100,
      }));
  } finally {
    await worker.terminate();
  }

  onProgress?.({ step: 'analyzing', message: 'Extrayendo datos…', percent: 90 });
  const entities = extractEntities(fullText);
  onProgress?.({ step: 'done', message: 'Listo', percent: 100 });

  return { fullText, lines, entities, avgConfidence };
}
