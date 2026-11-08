/**
 * Líneas de detalle guiadas por las cuentas (código puro).
 *
 * Copia de Vectium-SpA/motores (OCRCODE/items.ts, 2026-11-08): la versión que manda vive allá; si se mejora, copiar.
 *
 * El OCR entrega cada fila como texto: «50938 Atun aleta amarilla lomo 2,5 kg $ 11.681 $ 29.202».
 * En vez de adivinar por posición, se prueban las formas posibles de leer la cola de números
 * (cantidad, precio, descuento, total) y se elige la que cierra: cantidad × precio − descuento = total.
 *
 * Formatos que reconoce:
 *  - Factura: [código] descripción cantidad [unidad] precio [descuento] total
 *  - Boleta en dos líneas: «Lechuga costina» + «10 x $ 790 $ 7.900»
 *  - Supermercado: «2 X $1.290» + «LECHE ENTERA 1L $2.580»
 */

import type { ItemDocumento } from './types';

/** Línea en el formato del motor de Vectium (Motores/contrato); se traduce a ItemDocumento al final. */
interface Item {
  descripcion: string;
  codigo: string | null;
  cantidad: number;
  unidad: string | null;
  precio_unitario: number;
  descuento: number | null;
  exento: boolean;
  total: number;
}

const UNIDAD =
  /^(bot|botella|botellas|un|uni|unid|und|ud|uds|kg|kgs|kilo|kilos|gr|grs|g|lt|lts|l|cc|ml|cj|caja|cajas|doc|docena|pack|paq|pag|pqt|saco|sacos|bidon|bidón|tarro|tarros|bulto|bultos|pza|pzas|rollo|rollos|lata|latas|frasco|frascos|sobre|sobres|display|par|set|kit|mt|mts|m|metro|metros|bolsa|bolsas|malla|mallas|atado|atados|galon|galón|bandeja|bandejas|unidad|unidades)$/i;

/** Encabezado de la tabla de detalle. */
const ENCABEZADO = /(descripci[oó]n|detalle|producto|art[ií]culo).*(cant|valor|total|precio)|c[oó]digo.*(descripci|cant)/i;
/** Primera línea de totales: ahí termina la tabla. */
const FIN_TABLA = /\b(monto\s+neto|neto|sub\s*-?\s*total|total|[i1l]\s?\.?\s?v\s?\.?\s?a\b|exento|timbre)/i;
/** Líneas de cabecera que nunca son ítems. */
const CABECERA = /\b(r\.?\s?u\.?\s?t|giro|fono|tel[eé]fono|se[ñn]or|direcci[oó]n|fecha|condici[oó]n|vendedor|comuna|ciudad|www|res\.|resoluci[oó]n|s\.?\s?i\.?\s?i)\b|@/i;

const esMonto = (t: string) =>
  /^\$?\d{1,3}(?:\.\d{3})+$/.test(t) || /^\$?\d+$/.test(t) || /^\$?\d{1,3}(?:\.\d{3})*,\d{1,4}$/.test(t); // «85,81», «1.234,56»
const esCantidad = (t: string) => /^\d+(?:[.,]\d{1,3})?$/.test(t) && !/^\d{1,3}\.\d{3}$/.test(t);
/** «$1.234» → 1234 · «85,81» → 85.81 · «1.234,56» → 1234.56 */
const aMonto = (t: string) => Number(t.replace(/\$/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
const aCantidad = (t: string) => Number(t.replace(',', '.'));
const tieneLetras = (s: string) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(s);

function limpiar(linea: string): string {
  return linea
    .replace(/[|[\]{}]/g, ' ')
    .replace(/\$\s+/g, '$')
    .replace(/(\d)\s+(\d{3})(?!\d)/g, (m, a, b, off, s) => (/\$\d*$/.test(s.slice(0, off + 1)) ? `${a}.${b}` : m)) // «$ 94 889»
    .replace(/\s+/g, ' ')
    .trim();
}

const cierra = (q: number, p: number, d: number, t: number) => Math.abs(q * p - d - t) <= Math.max(2, Math.abs(t) * 0.005);

interface Cola {
  /** Tokens a saltar al comienzo (la cantidad impresa antes de la descripción: «600,00 ENVASE…»). */
  salto?: number;
  inicio: number; // índice del primer token que no es de la descripción
  cantidad: number;
  unidad: string | null;
  precio: number;
  descuento: number | null;
  total: number;
  cierra: boolean;
}

/** Prueba las lecturas posibles de la cola de números y devuelve la mejor (la que cierra, si hay). */
function leerCola(tokens: string[]): Cola | null {
  // Montos al final (máx. 4: cantidad sin unidad, precio, descuento, total).
  let i = tokens.length;
  const montos: string[] = [];
  while (i > 0 && esMonto(tokens[i - 1]) && montos.length < 4) montos.unshift(tokens[--i]);
  if (!montos.length) return null;

  const opciones: Cola[] = [];
  const agregar = (inicio: number, q: number, unidad: string | null, resto: number[]) => {
    const t = resto[resto.length - 1];
    if (!(t > 0) || !(q > 0)) return;
    if (resto.length >= 3) {
      const [p, d] = resto.slice(-3);
      opciones.push({ inicio, cantidad: q, unidad, precio: p, descuento: d, total: t, cierra: cierra(q, p, d, t) });
    }
    if (resto.length >= 2) {
      const p = resto[resto.length - 2];
      opciones.push({ inicio, cantidad: q, unidad, precio: p, descuento: null, total: t, cierra: cierra(q, p, 0, t) });
    }
    if (resto.length === 1) opciones.push({ inicio, cantidad: q, unidad, precio: Math.round(t / q), descuento: null, total: t, cierra: q === 1 });
  };

  const valores = montos.map(aMonto);
  // a) cantidad (y unidad) antes de los montos: «2,5 kg $11.681 $29.202» o «2,5 $11.681 $29.202»
  let j = i;
  let unidad: string | null = null;
  if (j > 0 && UNIDAD.test(tokens[j - 1])) unidad = tokens[--j];
  if (j > 0 && esCantidad(tokens[j - 1])) {
    const tq = tokens[j - 1];
    agregar(j - 1, aCantidad(tq), unidad, valores);
    // El OCR suele perder la coma decimal («4,2 kg» → «42 kg»): si así cierra, era decimal.
    if (/^\d{2,4}$/.test(tq)) for (const div of [10, 100]) agregar(j - 1, Number(tq) / div, unidad, valores);
  }
  // b) la cantidad es el primer «monto» (sin $): «Producto A 2 5.000 10.000» o «Lechuga 2,5 790 1.975»
  if (!unidad && montos.length >= 2 && (/^\d{1,4}$/.test(montos[0]) || /^\d{1,4},\d{1,3}$/.test(montos[0])))
    agregar(i, aCantidad(montos[0]), null, valores.slice(1));
  // c) cantidad al comienzo de la fila: «600,00 ENVASE CT205 SIN TAPA 85,81 51.486»
  if (/^\d{1,5}(?:,\d{1,3})?$/.test(tokens[0] ?? '') && tieneLetras(tokens[1] ?? '') && i > 1) {
    const antes = opciones.length;
    agregar(i, aCantidad(tokens[0]), unidad, valores);
    for (let k = antes; k < opciones.length; k++) opciones[k].salto = 1;
  }
  // d) sin cantidad impresa: se asume 1
  if (!opciones.length) agregar(i, 1, unidad, valores);

  if (!opciones.length) return null;
  // La mejor: la que cierra; si varias cierran, la que usa más tokens (descripción más corta = menos números colgando).
  // sort es estable: a igualdad, gana el orden en que se agregaron (la lectura literal antes que la corregida).
  opciones.sort((a, b) => Number(b.cierra) - Number(a.cierra) || a.inicio - b.inicio);
  return opciones[0];
}

function itemDe(desc: string, c: Omit<Cola, 'inicio' | 'cierra'>, codigo: string | null = null, exento = false): Item {
  return {
    descripcion: desc.trim(),
    codigo,
    cantidad: c.cantidad,
    unidad: c.unidad,
    precio_unitario: c.precio,
    descuento: c.descuento || null,
    exento,
    total: c.total,
  };
}

export interface ResultadoItems {
  items: Item[];
  /** Cuántos cierran su propia cuenta (cantidad × precio − descuento = total). */
  cierran: number;
}

export function itemsPorCuentas(lineasOcr: { text: string }[]): ResultadoItems {
  const lineas = lineasOcr.map((l) => limpiar(l.text));
  const iEnc = lineas.findIndex((l) => ENCABEZADO.test(l));
  const desde = iEnc >= 0 ? iEnc + 1 : 0;
  let hasta = lineas.length;
  for (let k = desde; k < lineas.length; k++) {
    if (FIN_TABLA.test(lineas[k]) && !/\bx\s*\$?\d/i.test(lineas[k])) {
      hasta = k;
      break;
    }
  }

  const items: Item[] = [];
  let cierran = 0;
  let pendiente: string | null = null; // descripción sin números (boleta en dos líneas)
  let multiplicador: { q: number; p: number } | null = null; // «2 X $1.290» (supermercado)

  for (let k = desde; k < hasta; k++) {
    const l = lineas[k];
    if (!l || (iEnc < 0 && CABECERA.test(l))) {
      pendiente = null;
      continue;
    }

    // «10 x $ 790 $ 7.900» (con o sin total)
    const mx = l.match(/^(\d+(?:[.,]\d{1,3})?)\s*[xX*]\s*\$?(\d{1,3}(?:\.\d{3})+|\d+)(?:\s+\$?(\d{1,3}(?:\.\d{3})+|\d+))?$/);
    if (mx) {
      const q = aCantidad(mx[1]);
      const p = aMonto(mx[2]);
      if (mx[3] && pendiente) {
        const t = aMonto(mx[3]);
        items.push(itemDe(pendiente, { cantidad: q, unidad: null, precio: p, descuento: null, total: t }));
        if (cierra(q, p, 0, t)) cierran++;
        pendiente = null;
      } else multiplicador = { q, p };
      continue;
    }

    const tokens = l.split(' ');
    const cola = leerCola(tokens);
    if (!cola || !tieneLetras(tokens.slice(cola.salto ?? 0, cola.inicio).join(' '))) {
      // Sin números: puede ser la descripción de la línea siguiente.
      pendiente = tieneLetras(l) && !/\$|\d{1,3}\.\d{3}/.test(l) ? l : null;
      continue;
    }
    let desc = tokens.slice(cola.salto ?? 0, cola.inicio);
    // Marca de línea exenta («EX», «E», «EXENTO» suelta entre los números).
    const exento = tokens.slice(cola.inicio).concat(desc.slice(-1)).some((t) => /^(EX|E|EXENTO|EXE)$/i.test(t));
    if (exento && /^(EX|E|EXENTO|EXE)$/i.test(desc[desc.length - 1] ?? '')) desc = desc.slice(0, -1);
    let codigo: string | null = null;
    if (desc.length > 1 && /^\d{3,}$/.test(desc[0])) codigo = desc.shift()!;

    if (multiplicador && cola.total > 0 && cierra(multiplicador.q, multiplicador.p, 0, cola.total)) {
      items.push(itemDe(desc.join(' '), { cantidad: multiplicador.q, unidad: null, precio: multiplicador.p, descuento: null, total: cola.total }, codigo, exento));
      cierran++;
    } else {
      // Sin encabezado de tabla solo se aceptan filas cuyas cuentas cierran: evita cargar basura.
      if (iEnc < 0 && !cola.cierra) {
        pendiente = null;
        multiplicador = null;
        continue;
      }
      items.push(itemDe(desc.join(' '), cola, codigo, exento));
      if (cola.cierra) cierran++;
    }
    pendiente = null;
    multiplicador = null;
  }
  return { items, cierran };
}

/** Las mismas líneas en el formato de Gestionala (ItemDocumento). La confianza es alta si la cuenta de la línea cierra. */
export function itemsPorCuentasGestionala(lineas: { text: string }[]): { items: ItemDocumento[]; cierran: number } {
  const r = itemsPorCuentas(lineas);
  return {
    cierran: r.cierran,
    items: r.items.map((it) => ({
      descripcion: it.descripcion,
      cantidad: it.cantidad,
      precio: it.precio_unitario,
      total: it.total,
      unidad: it.unidad ?? undefined,
      confianza: Math.abs(it.cantidad * it.precio_unitario - (it.descuento ?? 0) - it.total) <= Math.max(2, Math.abs(it.total) * 0.005) ? 0.85 : 0.5,
    })),
  };
}
