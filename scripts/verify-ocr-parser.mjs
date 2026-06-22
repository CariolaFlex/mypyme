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

// Reproduce cómo engine.ts arma el OCRRaw. Las entidades (RUT/fecha) se replican
// con los MISMOS regex de engine.ts para no importar engine.ts (que arrastra
// preprocess y el type-strip crudo de Node no resuelve el import sin extensión).
// El parser de líneas/montos/ítems sí es el real (factura.ts).
const RUT_ENTITY = /\b\d{1,2}\.?\d{3}\.?\d{3}\s*[-–]\s*[\dkK]\b/g;
const DATE_ENTITY = /\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g;
function entitiesDe(text) {
  const out = [];
  for (const m of text.matchAll(RUT_ENTITY)) out.push({ label: 'TAX_ID', text: m[0], normalized: m[0].replace(/\s/g, '') });
  for (const m of text.matchAll(DATE_ENTITY)) out.push({ label: 'DATE', text: m[0] });
  return out;
}
function raw(name, conf) {
  const text = fixture(name);
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

// ── Coca-Cola "soporte de entrega" (sin etiqueta total; importe en letra) ────
console.log('Coca-Cola:');
{
  const r = extraerFactura(raw('coca.txt', 0.8), 'otro');
  check('total', r.total, 115000);
  check('items', r.items.length, 2);
  check('item1 cantidad', r.items[0].cantidad, 10);  // columna unidad "10 BOT"
  check('item2 cantidad', r.items[1].cantidad, 12);
  check('cuadre neto+iva', r.neto + r.iva, r.total);
}

// ── Andina (DTE chilena; OCR perdió el separador: "TOTAL FACTURA 11 901") ────
console.log('Andina:');
{
  const r = extraerFactura(raw('andina.txt', 0.7), 'factura');
  check('total', r.total, 11901);                 // OCR leyó "11 901" (real 11.881)
  check('rut proveedor', r.rut, '91.144.000-8');
  check('folio', r.folio, '0000155241');          // "N* 0000155241"
}

// ── ABC SpA (factura de compra; "MONTONETO" pegado, IVA retenido) ───────────
console.log('ABC SpA:');
{
  const r = extraerFactura(raw('abc.txt', 0.8), 'factura');
  check('total', r.total, 7307927);
  check('neto', r.neto, 7307927);                 // "MONTONETO" sin espacio
  check('iva', r.iva, 1388506);
  check('rut proveedor', r.rut, '77.777.777-0');
  check('fecha (escrita)', r.fecha, '2024-01-22');
  check('folio NO es el teléfono', r.folio, ''); // antes agarraba "Telefono 111111111"
}

// ── DSV-GL (factura cancelada/fax; caso difícil) ────────────────────────────
console.log('DSV-GL:');
{
  const r = extraerFactura(raw('dsv.txt', 0.6), 'factura');
  check('total', r.total, 25700);  // lo que leyó el OCR (real 35.700: el motor erró un dígito)
  check('items basura descartados', r.items.length, 0);
  check('rut (con espacios)', r.rut, '96.570.750-6');
}

// ── Sintéticos de formato (regresión de heurísticas) ────────────────────────
console.log('Sintéticos:');
{
  const f1 = `PROVEEDOR DEMO SpA RUT 76.192.083-9
Producto A 2 5.000 10.000
TOTAL A PAGAR 19.147
SON: DIECINUEVE MIL CIENTO CUARENTA Y SIETE PESOS`;
  const r1 = extraerFactura({ fullText: f1, lines: f1.split('\n').map((t) => ({ text: t.trim() })), entities: entitiesDe(f1), avgConfidence: 0.9 }, 'factura');
  check('etiqueta TOTAL gana', r1.total, 19147);

  const f2 = `Aceite Chef 1 LT 2 990 1.980`;
  const r2 = extraerFactura({ fullText: f2, lines: [{ text: f2 }], entities: [], avgConfidence: 0.9 }, 'factura');
  check('contenido (1 LT) no pisa cantidad', r2.items[0]?.cantidad, 2);
}

// ── Panamá (OCR del motor ilegible: el total NO quedó en el texto) ──────────
// No se puede recuperar el total, pero SÍ se exige que NO invente uno: antes
// tomaba el año "2022" (de "MAYO, 2022") como total. Mejor 0 (no detectado).
console.log('Panamá (no inventar año como total):');
{
  const r = extraerFactura(raw('panama.txt', 0.5), 'factura');
  check('total no es el año', r.total, 0);
}

// ── Informativo: docs cuyo OCR del motor falló (no recuperable por parser) ──
console.log('Informativo (OCR del motor ilegible — no se asierta):');
for (const [name, tipo] of [['ccu.txt', 'factura']]) {
  const r = extraerFactura(raw(name, 0.5), tipo);
  console.log(`  ${name}: total=${r.total} items=${r.items.length} (se corrige a mano)`);
}

console.log(fails === 0 ? '\nTODO OK ✓' : `\n${fails} FALLAS ✗`);
process.exit(fails === 0 ? 0 : 1);
