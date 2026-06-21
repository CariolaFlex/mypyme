/**
 * Verificación del parser OCR (lib/ocr/factura.ts) contra TEXTO OCR REAL.
 *
 * Metodología (importante): se valida contra el texto que Tesseract realmente
 * produce (pegado del visor "Ver texto reconocido" de la app), NO contra
 * reconstrucciones idealizadas del PDF. Los fixtures viven en
 * scripts/ocr-fixtures/*.txt. Para sumar una factura: pegá su texto OCR real en
 * un .txt nuevo y agregá un caso acá.
 *
 * Requiere Node 24 (type-stripping nativo para importar el .ts directo).
 * Correr: node scripts/verify-ocr-parser.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extraerFactura } from '../lib/ocr/factura.ts';

const DIR = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(DIR, 'ocr-fixtures', name), 'utf8');

// Reproduce cómo engine.ts arma el OCRRaw a partir de fullText. Las entidades
// (RUT/fecha) se replican acá con los MISMOS regex de engine.ts para no importar
// engine.ts (que arrastra preprocess y el type-strip crudo de Node no resuelve el
// import sin extensión). El parser de líneas/montos/ítems sí es el real (factura.ts).
const RUT_ENTITY = /\b\d{1,2}\.?\d{3}\.?\d{3}\s*[-–]\s*[\dkK]\b/g;
const DATE_ENTITY = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g;
function entitiesDe(text) {
  const out = [];
  for (const m of text.matchAll(RUT_ENTITY)) out.push({ label: 'TAX_ID', text: m[0], normalized: m[0].replace(/\s/g, '') });
  for (const m of text.matchAll(DATE_ENTITY)) out.push({ label: 'DATE', text: m[0] });
  return out;
}
function toRaw(text, conf) {
  const lines = text
    .split('\n')
    .map((t) => ({ text: t.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text.length > 0)
    .map((l) => ({ text: l.text, confidence: conf }));
  return { fullText: text, lines, entities: entitiesDe(text), avgConfidence: conf };
}

let fails = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) fails++;
  console.log(`  ${ok ? 'OK ✓' : 'FAIL ✗'}  ${label}: ${actual}${ok ? '' : ` (esperado ${expected})`}`);
}

// ── Coca-Cola "soporte de entrega" (sin etiqueta de total; importe en letra) ──
console.log('Coca-Cola (texto OCR real):');
{
  const r = extraerFactura(toRaw(fixture('coca.txt'), 0.8), 'otro');
  check('total', r.total, 115000);                 // de "CIENTO QUINCE MIL PESOS" / suma ítems
  check('items', r.items.length, 2);
  check('item1 total', r.items[0].total, 60000);
  check('item2 total', r.items[1].total, 55000);
  check('item1 cantidad', r.items[0].cantidad, 10); // desde columna unidad "10 BOT"
  check('item2 cantidad', r.items[1].cantidad, 12);
  check('cuadre neto+iva', r.neto + r.iva, r.total);
}

// ── DSV-GL (factura cancelada/timbrada/fax, USD+CLP, ~60% confianza) ─────────
console.log('DSV-GL (texto OCR real, caso difícil):');
{
  const r = extraerFactura(toRaw(fixture('dsv.txt'), 0.6), 'factura');
  check('total', r.total, 25700);   // lo que el OCR leyó (real 35.700: el motor erró un dígito)
  check('items', r.items.length, 0); // el timbre "a \ 2% M9" ya NO se cuela como ítem
  check('RUT (entity, con espacios)', r.rut, '96.570.750-6'); // regex tolera "96.570.750 - 6"
}

// ── Casos sintéticos de formato (regresión de heurísticas) ──────────────────
console.log('Sintéticos (formato):');
{
  // Etiqueta fuerte gana; prosa con "pesos" no inventa.
  const f1 = `PROVEEDOR DEMO SpA RUT 76.192.083-9
Producto A 2 5.000 10.000
TOTAL A PAGAR 19.147
SON: DIECINUEVE MIL CIENTO CUARENTA Y SIETE PESOS`;
  check('etiqueta TOTAL gana', extraerFactura(toRaw(f1, 0.9), 'factura').total, 19147);

  // "Aceite 1 LT 2 990 1.980": el 2 (cola) es la cantidad, NO el 1 del contenido.
  const f2 = `Aceite Chef 1 LT 2 990 1.980`;
  const r2 = extraerFactura(toRaw(f2, 0.9), 'factura');
  check('contenido no pisa cantidad', r2.items[0]?.cantidad, 2);

  // Fecha escrita chilena.
  const f3 = `Fecha Emision: 22 de Enero del 2024
TOTAL 1.000`;
  check('fecha escrita', extraerFactura(toRaw(f3, 0.9), 'factura').fecha, '2024-01-22');
}

console.log(fails === 0 ? '\nTODO OK ✓' : `\n${fails} FALLAS ✗`);
process.exit(fails === 0 ? 0 : 1);
