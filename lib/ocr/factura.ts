/**
 * Extracción de datos de una factura desde el resultado OCR.
 *
 * HEURÍSTICO y BEST-EFFORT: Tesseract devuelve texto plano, no una tabla. Lo que
 * sale de acá es un punto de partida que el usuario SIEMPRE revisa y corrige en la
 * UI antes de guardar. No prometer precisión en facturas de layout complejo.
 *
 * Es la estrategia "factura formal" del DocumentParser (lib/ocr/parser). Los
 * helpers de montos/fechas viven en parser/comun.ts (movidos verbatim); acá
 * queda la cascada de decisión y el parser de ítems. `extraerFactura` conserva
 * su firma histórica; `extraerFacturaDetallada` agrega la FUENTE de cada monto
 * para que el parser derive confianza por campo.
 */

import type { OCRRaw, FacturaExtraida, ItemFactura, TipoDocOCR } from './types';
import {
  fechaDocumento,
  first,
  maxMonto,
  montoEnLetra,
  montoEnLineas,
  montoTrasEtiqueta,
} from './parser/comun';

/**
 * Ítems de línea (best-effort). Tesseract da texto plano, no tabla → heurística:
 * por cada línea con una descripción a la izquierda y ≥2 números al final, toma
 * el último como total, el anterior como precio unitario y un entero corto como
 * cantidad. Más recall que el regex estricto anterior (que exigía exactamente
 * "desc cant precio total"). Siempre editable; el usuario borra los falsos.
 */
export function parseItems(lines: { text: string }[]): ItemFactura[] {
  const items: ItemFactura[] = [];
  const saltar =
    /total|neto|i\.?v\.?a|sub\s*-?\s*total|rut|n[°ºo]\s*factura|fecha|se[ñn]or|cliente|giro|direcci[oó]n|tel[eé]fono|email|correo|importe|c[oó]digo|descripci[oó]n|cantidad|precio|unitario|p[aá]gina|despacho|consecutivo|ruta/i;

  const esMonto = (t: string) =>
    /^\d{1,3}(?:\.\d{3})+$/.test(t) || /^\d+$/.test(t) || /^\d+,\d+$/.test(t);
  const esEnteroCorto = (t: string) => /^\d+$/.test(t) && Number(t) > 0 && Number(t) < 1000;
  // Unidades de medida típicas: el OCR aplana las columnas y la cantidad suele
  // quedar antes de la unidad ("... 10 BOT"), fuera de la cola de montos.
  const UNIDAD =
    /^(bot|un|unid|und|ud|kg|kgs|gr|grs|lt|lts|cc|ml|cj|caja|cajas|doc|docena|pack|saco|sacos|bid[oó]n|tarro|tarros|tira|tiras|bulto|bultos|kilo|kilos|kls?|pza|pzas|rollo|rollos|barra|barras|lata|latas|frasco|frascos|paq|pqt|sobre|sobres|display)$/i;

  const parseMonto = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

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

    const montos = cola.map(parseMonto);
    const total = montos[montos.length - 1];
    if (!(total > 0)) continue;

    let cantidad = 1;
    let precio = total;
    let cantDeCola = false;
    if (cola.length === 2) {
      // [cantidad, total] si el primero es entero chico; si no [precio, total].
      if (esEnteroCorto(cola[0])) {
        cantidad = montos[0];
        precio = cantidad > 0 ? Math.round(total / cantidad) : total;
        cantDeCola = true;
      } else {
        precio = montos[0];
      }
    } else {
      precio = montos[montos.length - 2] || total;
      const idx = cola.slice(0, -1).findIndex(esEnteroCorto);
      if (idx >= 0) { cantidad = montos[idx]; cantDeCola = true; }
    }

    // Descripción = lo de antes de la cola, sin los códigos de posición iniciales.
    let head = tokens.slice(0, i);
    while (head.length && /^\d+$/.test(head[0])) head = head.slice(1);

    // Cantidad desde la columna unidad ("... 10 BOT") SOLO si la cola no dio una
    // cantidad (no pisar "Aceite 1 LT 2 990 1.980" donde el 2 de la cola es la qty
    // y el "1 LT" es el contenido, no la cantidad).
    if (!cantDeCola && head.length >= 2 && UNIDAD.test(head[head.length - 1]) && /^\d{1,4}$/.test(head[head.length - 2])) {
      const c = Number(head[head.length - 2]);
      if (c > 0) { cantidad = c; precio = Math.round(total / c); head = head.slice(0, -2); }
    }
    if (!(cantidad > 0)) cantidad = 1;

    const descripcion = head.join(' ').trim();
    if (descripcion.length < 3) continue;
    // Necesita una PALABRA real (≥3 letras seguidas): descarta líneas de timbres/
    // anotaciones a mano que el OCR lee como «a \ 2% M9» y se colaban como ítem
    // (y luego envenenaban el total por suma de ítems).
    if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(descripcion)) continue;

    items.push({ descripcion: descripcion.slice(0, 120), cantidad, precio, total });
    if (items.length >= 60) break; // techo de seguridad
  }
  return items;
}

/** De dónde salió cada monto (para derivar confianza por campo en el parser). */
export interface FuentesFactura {
  total: 'etiqueta' | 'letra' | 'suma_items' | 'derivado' | 'fallback' | '';
  neto: 'etiqueta' | 'derivado' | '';
  iva: 'etiqueta' | 'derivado' | '';
}

export interface FacturaDetallada {
  factura: FacturaExtraida;
  fuentes: FuentesFactura;
}

/** Igual que `extraerFactura` pero reporta la fuente de total/neto/iva.
 *  La cascada y los valores son EXACTAMENTE los históricos. */
export function extraerFacturaDetallada(raw: OCRRaw, tipo: TipoDocOCR = 'factura'): FacturaDetallada {
  const { entities, lines, fullText } = raw;

  const rut = first(entities, 'TAX_ID')?.normalized ?? '';
  const razonSocial = first(entities, 'ORGANIZATION')?.text ?? lines[0]?.text.slice(0, 80) ?? '';
  const fecha = fechaDocumento(lines, entities);

  // Folio / N° de factura. OJO: el "factura" suelto agarraba "TOTAL FACTURA 11881"
  // (el total) como folio → exigir un marcador de número (N°/Nº/No/Nro/Folio/#),
  // o "factura N°". Sin marcador legible, mejor folio vacío que tomar el total.
  // \b antes de cada marcador de palabra: si no, el "no" de "teléfoNo" agarraba el
  // teléfono como folio (ABC). El "*" cubre el OCR de "Nº" como "N*" (Andina).
  const folioM = fullText.match(
    /(?:\bfolio|\bnro\.?|\bn[°ºo*]\.?|#|\bfactura\s*(?:electr[oó]nica\s*)?n[°ºo*]\.?)\s*[:.\-]?\s*(\d{3,})/i
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

  const fuentes: FuentesFactura = { total: '', neto: '', iva: '' };

  // Etiquetas fuertes primero (los 4 docs chilenos resuelven acá → sin regresión).
  // Si fallan, el monto-en-letra y la suma de ítems son mejores que "el mayor
  // número de la hoja" (que agarra códigos de material, como el 135760 de Coca-Cola).
  // Cascada explícita (en vez de ||) para registrar la fuente ganadora.
  let total = 0;
  const candidatosTotal: [number, FuentesFactura['total']][] = [
    [montoTrasEtiqueta(abajo, lblTotal, folio), 'etiqueta'],
    [montoTrasEtiqueta(lines, lblTotal, folio), 'etiqueta'],
    [montoEnLineas(abajo, /total/i, exclTotal, folio), 'etiqueta'],
    [montoEnLineas(lines, /total/i, exclTotal, folio), 'etiqueta'],
    [montoEnLetra(lines), 'letra'],
    [sumaItems >= 1000 ? sumaItems : 0, 'suma_items'],
    [maxMonto(abajo, folio), 'fallback'],
  ];
  for (const [v, f] of candidatosTotal) {
    if (v) {
      total = v;
      fuentes.total = f;
      break;
    }
  }

  let neto =
    montoTrasEtiqueta(abajo, /monto\s*neto|\bneto\b|afecto/i, folio) ||
    montoTrasEtiqueta(lines, /monto\s*neto|\bneto\b|afecto/i, folio);
  if (neto) fuentes.neto = 'etiqueta';
  let iva =
    montoTrasEtiqueta(abajo, /i\.?v\.?a(?!\s*adicional)/i, folio) ||
    montoTrasEtiqueta(lines, /i\.?v\.?a(?!\s*adicional)/i, folio);
  if (iva) fuentes.iva = 'etiqueta';

  if (total && !neto && !iva) {
    neto = Math.round(total / 1.19);
    iva = total - neto;
    fuentes.neto = 'derivado';
    fuentes.iva = 'derivado';
  } else if (!total && neto) {
    total = neto + iva;
    fuentes.total = 'derivado';
  }

  // Boletas/guías/otros normalmente NO desglosan neto/IVA: si solo hay total
  // (o el desglose detectado no cuadra), derivar asumiendo 19% (editable).
  if (tipo !== 'factura' && total && (!neto || !iva || Math.abs(neto + iva - total) > 2)) {
    neto = Math.round(total / 1.19);
    iva = total - neto;
    fuentes.neto = 'derivado';
    fuentes.iva = 'derivado';
  }

  return { factura: { rut, razonSocial, folio, fecha, neto, iva, total, items }, fuentes };
}

export function extraerFactura(raw: OCRRaw, tipo: TipoDocOCR = 'factura'): FacturaExtraida {
  return extraerFacturaDetallada(raw, tipo).factura;
}
