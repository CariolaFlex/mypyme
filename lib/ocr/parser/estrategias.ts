/**
 * Estrategias de extracción por tipo de documento.
 *
 * - factura: delega en el parser histórico de facturas (lib/ocr/factura.ts) —
 *   retrocompatibilidad dura — y lo refina con el layout por coordenadas SOLO
 *   si el resultado cuadra mejor con el total.
 * - ticket: boletas de caja / restaurante (cantidad adelante, sin desglose IVA).
 * - servicio: presupuestos / cotizaciones / recibos / profesionales
 *   (conceptos con un monto, horas × tarifa, m²/m³, "+ IVA").
 */

import type {
  CampoExtraido,
  ItemDocumento,
  OCRRaw,
  ParserContext,
  TipoDocOCR,
} from '../types';
import { extraerFacturaDetallada } from '../factura';
import { itemsPorLayout } from './layout';
import {
  fechaDocumento,
  first,
  maxMonto,
  montoEnLetra,
  montoTrasEtiqueta,
  parseMonto,
} from './comun';
import { parseMontoUniversal } from '../montos';

export interface ResultadoEstrategia {
  taxId: CampoExtraido<string>;
  emisor: CampoExtraido<string>;
  folio: CampoExtraido<string>;
  fecha: CampoExtraido<string>;
  neto: CampoExtraido<number>;
  iva: CampoExtraido<number>;
  total: CampoExtraido<number>;
  items: ItemDocumento[];
}

/** Confianza por fuente del monto (calibración gruesa: etiqueta pegada >
 *  monto-en-letra > suma de ítems > derivación aritmética > "mayor de la hoja"). */
const CONF_FUENTE: Record<string, number> = {
  etiqueta: 0.9,
  letra: 0.85,
  suma_items: 0.7,
  derivado: 0.6,
  fallback: 0.35,
  '': 0,
};

/** Campos comunes de cabecera (los extraen igual las tres estrategias). */
function cabecera(raw: OCRRaw): Pick<ResultadoEstrategia, 'taxId' | 'emisor' | 'fecha'> {
  const { entities, lines } = raw;
  const tax = first(entities, 'TAX_ID');
  const org = first(entities, 'ORGANIZATION');
  const fecha = fechaDocumento(lines, entities);
  return {
    taxId: { valor: tax?.normalized ?? '', confianza: tax ? 0.9 : 0, fuente: 'entidad' },
    emisor: org
      ? { valor: org.text, confianza: 0.8, fuente: 'entidad' }
      : { valor: lines[0]?.text.slice(0, 80) ?? '', confianza: lines[0] ? 0.4 : 0, fuente: 'fallback' },
    fecha: { valor: fecha, confianza: fecha ? 0.8 : 0, fuente: 'etiqueta' },
  };
}

// ─── Estrategia: factura formal ──────────────────────────────────────────────

export function estrategiaFactura(raw: OCRRaw, tipo: TipoDocOCR): ResultadoEstrategia {
  const { factura, fuentes } = extraerFacturaDetallada(raw, tipo);
  const base = cabecera(raw);

  // Refinamiento por layout: si Tesseract entregó coordenadas y la tabla
  // espacial cuadra MEJOR con el total que la heurística de texto plano, usarla.
  // Guarda anti-regresión: nunca se cambia si no mejora el cuadre.
  let items: ItemDocumento[] = factura.items;
  const layout = itemsPorLayout(raw.lines);
  if (layout && factura.total > 0) {
    const suma = (xs: ItemDocumento[]) => xs.reduce((a, it) => a + (it.total || 0), 0);
    if (Math.abs(suma(layout) - factura.total) < Math.abs(suma(items) - factura.total)) {
      items = layout;
    }
  }

  return {
    ...base,
    // El RUT/razón social ya venían de las mismas entidades: usar los valores
    // del parser histórico (idénticos) con la confianza de la cabecera.
    taxId: { ...base.taxId, valor: factura.rut },
    emisor: { ...base.emisor, valor: factura.razonSocial },
    fecha: { ...base.fecha, valor: factura.fecha },
    folio: { valor: factura.folio, confianza: factura.folio ? 0.8 : 0, fuente: 'etiqueta' },
    neto: { valor: factura.neto, confianza: CONF_FUENTE[fuentes.neto] ?? 0, fuente: fuentes.neto },
    iva: { valor: factura.iva, confianza: CONF_FUENTE[fuentes.iva] ?? 0, fuente: fuentes.iva },
    total: { valor: factura.total, confianza: CONF_FUENTE[fuentes.total] ?? 0, fuente: fuentes.total },
    items,
  };
}

// ─── Estrategia: ticket de caja / restaurante ────────────────────────────────

/** Deriva neto/iva desde el total según el perfil del negocio (los tickets no
 *  desglosan). Sin IVA (o sin perfil) → exento. */
function derivarImpuestos(total: number, ctx: ParserContext): { neto: number; iva: number; fuente: string } {
  const tasa = ctx.usaIva ? (ctx.tasaIva ?? 19) : 0;
  if (!(total > 0) || tasa <= 0) return { neto: total, iva: 0, fuente: 'derivado' };
  const neto = Math.round(total / (1 + tasa / 100));
  return { neto, iva: total - neto, fuente: 'derivado' };
}

export function estrategiaTicket(raw: OCRRaw, ctx: ParserContext): ResultadoEstrategia {
  const { lines, fullText } = raw;
  const base = cabecera(raw);

  const folioM = fullText.match(
    /(?:\bboleta|\bticket|\bdoc(?:umento)?|\bn[°ºo*]\.?|#)\s*[:.\-]?\s*(\d{3,})/i
  );
  const folio = folioM?.[1] ?? '';

  // Total: etiqueta de caja; el monto en letra casi nunca existe en tickets.
  // "EFECTIVO"/"TARJETA" (lo pagado) sirve de respaldo — puede incluir vuelto,
  // por eso va después de TOTAL.
  let fuenteTotal = 'etiqueta';
  let total =
    montoTrasEtiqueta(lines, /total\s*(?:a\s*pagar)?|monto\s*a\s*pagar|\ba\s*pagar\b/i, folio) ||
    montoTrasEtiqueta(lines, /efectivo|tarjeta|d[eé]bito|cr[eé]dito/i, folio);
  if (!total) {
    total = maxMonto(lines, folio);
    fuenteTotal = 'fallback';
  }

  // Ítems de ticket: "2 COCA COLA 1.500" (cantidad adelante) o "COCA COLA 1.500"
  // (un solo monto al final). Los tickets no traen columna de precio unitario.
  const items: ItemDocumento[] = [];
  const saltar =
    /total|neto|i\.?v\.?a|sub\s*-?\s*total|efectivo|tarjeta|d[eé]bito|cr[eé]dito|vuelto|cambio|propina|cajero|caja|fecha|rut|gracias|atendi[oó]|mesa|mes[oó]n/i;
  for (const { text, confidence } of lines) {
    const linea = text.trim();
    if (linea.length < 5 || saltar.test(linea)) continue;
    // cantidad adelante: "2 COCA COLA 1.500" / "2x COCA COLA 1.500"
    let m = linea.match(/^(\d{1,3})\s*[xX]?\s+(.{3,}?)\s+\$?\s*([\d.,]{3,})$/);
    let cantidad = 1;
    let descripcion = '';
    let totalItem = 0;
    if (m) {
      cantidad = Number(m[1]) || 1;
      descripcion = m[2].trim();
      totalItem = parseMonto(m[3]);
    } else {
      // solo desc + monto final
      m = linea.match(/^(.{3,}?)\s+\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,7})$/);
      if (!m) continue;
      descripcion = m[1].trim();
      totalItem = parseMonto(m[2]);
    }
    if (!(totalItem > 0) || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(descripcion)) continue;
    items.push({
      descripcion: descripcion.slice(0, 120),
      cantidad,
      precio: cantidad > 0 ? Math.round(totalItem / cantidad) : totalItem,
      total: totalItem,
      confianza: confidence || 0.5,
    });
    if (items.length >= 60) break;
  }

  // Sin total etiquetado pero con ítems creíbles → su suma es mejor candidato.
  const sumaItems = items.reduce((a, it) => a + it.total, 0);
  if (fuenteTotal === 'fallback' && sumaItems >= 1000) {
    total = sumaItems;
    fuenteTotal = 'suma_items';
  }

  const imp = derivarImpuestos(total, ctx);
  const ivaEtiqueta = montoTrasEtiqueta(lines, /i\.?v\.?a(?!\s*adicional)/i, folio);
  const neto = ivaEtiqueta && total ? total - ivaEtiqueta : imp.neto;
  const iva = ivaEtiqueta || imp.iva;

  return {
    ...base,
    folio: { valor: folio, confianza: folio ? 0.7 : 0, fuente: 'etiqueta' },
    total: { valor: total, confianza: CONF_FUENTE[fuenteTotal] ?? 0.35, fuente: fuenteTotal },
    neto: { valor: neto, confianza: ivaEtiqueta ? 0.8 : 0.5, fuente: ivaEtiqueta ? 'etiqueta' : 'derivado' },
    iva: { valor: iva, confianza: ivaEtiqueta ? 0.8 : 0.5, fuente: ivaEtiqueta ? 'etiqueta' : 'derivado' },
    items,
  };
}

// ─── Estrategia: servicios / presupuestos / cotizaciones / recibos ──────────

export function estrategiaServicio(raw: OCRRaw, ctx: ParserContext): ResultadoEstrategia {
  const { lines, fullText } = raw;
  const base = cabecera(raw);

  const folioM = fullText.match(
    /(?:\bpresupuesto|\bcotizaci[oó]n|\brecibo|\bfolio|\bnro\.?|\bn[°ºo*]\.?|#)\s*[:.\-]?\s*(\d{2,})/i
  );
  const folio = folioM?.[1] ?? '';

  const items: ItemDocumento[] = [];
  const saltar =
    /total|neto|i\.?v\.?a|sub\s*-?\s*total|rut|fecha|se[ñn]or|cliente|direcci[oó]n|tel[eé]fono|email|correo|validez|forma\s+de\s+pago|banco|cuenta|transferencia/i;
  for (const { text, confidence } of lines) {
    const linea = text.trim();
    if (linea.length < 5 || saltar.test(linea)) continue;

    // horas × tarifa: "10 hrs x $15.000" / "3,5 horas a 20.000" — conceptos de
    // servicios técnicos y profesionales independientes.
    let m = linea.match(/(.*?)(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:hrs?\.?|horas?)\s*(?:x|\*|a|@|por)?\s*\$?\s*(\d[\d.,]*)/i);
    if (m) {
      const cantidad = parseMontoUniversal(m[2])?.valor ?? 0;
      const precio = parseMontoUniversal(m[3])?.valor ?? 0;
      if (cantidad > 0 && precio >= 100) {
        items.push({
          descripcion: (m[1].trim() || 'Horas de servicio').slice(0, 120),
          cantidad,
          precio,
          total: Math.round(cantidad * precio),
          unidad: 'hr',
          confianza: confidence || 0.6,
        });
        continue;
      }
    }
    // superficie/volumen × precio: "45 m2 x 12.000" (construcción/arriendo).
    m = linea.match(/(.*?)(\d{1,5}(?:[.,]\d{1,2})?)\s*(m[23²³])\s*(?:x|\*|a|@|por)?\s*\$?\s*(\d[\d.,]*)/i);
    if (m) {
      const cantidad = parseMontoUniversal(m[2])?.valor ?? 0;
      const precio = parseMontoUniversal(m[4])?.valor ?? 0;
      if (cantidad > 0 && precio >= 100) {
        items.push({
          descripcion: (m[1].trim() || `Superficie ${m[3]}`).slice(0, 120),
          cantidad,
          precio,
          total: Math.round(cantidad * precio),
          unidad: m[3].replace('²', '2').replace('³', '3').toLowerCase(),
          confianza: confidence || 0.6,
        });
        continue;
      }
    }
    // concepto + un monto al final: "Reparación bomba de agua 45.000".
    m = linea.match(/^(.{4,}?)\s+\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,8})$/);
    if (m && /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(m[1])) {
      const totalItem = parseMonto(m[2]);
      if (totalItem >= 100) {
        items.push({
          descripcion: m[1].trim().slice(0, 120),
          cantidad: 1,
          precio: totalItem,
          total: totalItem,
          confianza: confidence || 0.5,
        });
      }
    }
    if (items.length >= 60) break;
  }
  const sumaItems = items.reduce((a, it) => a + it.total, 0);

  let fuenteTotal = 'etiqueta';
  let total = montoTrasEtiqueta(lines, /total\s*(?:general|neto)?|\ba\s*pagar\b|valor\s*(?:total)?/i, folio);
  if (!total) {
    total = montoEnLetra(lines);
    if (total) fuenteTotal = 'letra';
  }
  if (!total && sumaItems >= 100) {
    total = sumaItems;
    fuenteTotal = 'suma_items';
  }
  if (!total) {
    total = maxMonto(lines, folio);
    fuenteTotal = 'fallback';
  }

  // "+ IVA": en presupuestos chilenos el monto mostrado suele ser NETO y el IVA
  // va aparte. "IVA incluido" → desglosar. Sin mención y negocio sin IVA → exento.
  const masIva = /\+\s*i\.?v\.?a|m[aá]s\s+i\.?v\.?a|i\.?v\.?a\s+no\s+incluido/i.test(fullText);
  const tasa = ctx.usaIva ? (ctx.tasaIva ?? 19) : 0;
  let neto: number;
  let iva: number;
  if (masIva && tasa > 0 && total > 0) {
    neto = total;
    iva = Math.round(neto * (tasa / 100));
    total = neto + iva;
  } else {
    const d = derivarImpuestos(total, ctx);
    neto = d.neto;
    iva = d.iva;
  }

  return {
    ...base,
    folio: { valor: folio, confianza: folio ? 0.7 : 0, fuente: 'etiqueta' },
    total: { valor: total, confianza: CONF_FUENTE[fuenteTotal] ?? 0.35, fuente: masIva ? 'derivado' : fuenteTotal },
    neto: { valor: neto, confianza: 0.55, fuente: 'derivado' },
    iva: { valor: iva, confianza: 0.55, fuente: 'derivado' },
    items,
  };
}
