/**
 * Detección de layout tabular a partir de las coordenadas de palabras que
 * entrega Tesseract (blocks). En vez de adivinar por la "cola de números" del
 * texto plano, agrupa los números por COLUMNA (alineación del borde derecho,
 * como se imprimen los montos) y asigna roles: cantidad / precio / total.
 *
 * Es un refinamiento, no un reemplazo: la estrategia lo usa solo si produce un
 * resultado que cuadra mejor que el parser de texto plano.
 */

import type { ItemDocumento, OCRLine, OCRWord } from '../types';
import { parseMontoUniversal } from '../montos';

/** Palabra que "parece número" (monto, cantidad o código): dígitos con
 *  separadores opcionales y $ opcional. */
function esNumerica(w: OCRWord): boolean {
  return /^\$?\d[\d.,]*$/.test(w.text);
}

const SALTAR =
  /total|neto|i\.?v\.?a|sub\s*-?\s*total|rut|n[°ºo]\s*factura|fecha|se[ñn]or|cliente|giro|direcci[oó]n|tel[eé]fono|email|correo|importe|c[oó]digo|descripci[oó]n|cantidad|precio|unitario|p[aá]gina|despacho|consecutivo|ruta/i;

interface Columna {
  /** Centro del borde derecho de la columna (los montos se alinean a la derecha). */
  x: number;
  valores: number[];
}

/** Agrupa bordes derechos (x1) de palabras numéricas en columnas. Dos números
 *  pertenecen a la misma columna si sus x1 difieren menos que el umbral. */
function agruparColumnas(xs: number[], umbral: number): number[] {
  const orden = [...xs].sort((a, b) => a - b);
  const centros: number[] = [];
  let grupo: number[] = [];
  for (const x of orden) {
    if (grupo.length && x - grupo[grupo.length - 1] > umbral) {
      centros.push(grupo.reduce((a, b) => a + b, 0) / grupo.length);
      grupo = [];
    }
    grupo.push(x);
  }
  if (grupo.length) centros.push(grupo.reduce((a, b) => a + b, 0) / grupo.length);
  return centros;
}

/**
 * Extrae ítems usando la posición de las palabras. Devuelve null si no hay
 * coordenadas suficientes o el layout no parece una tabla (menos de 2 filas
 * con ≥2 columnas numéricas estables).
 */
export function itemsPorLayout(lines: OCRLine[]): ItemDocumento[] | null {
  const conWords = lines.filter((l) => l.words && l.words.length >= 2);
  if (conWords.length < 3) return null;

  const anchoPagina = Math.max(...conWords.map((l) => l.bbox?.x1 ?? 0));
  if (!(anchoPagina > 0)) return null;
  const umbral = anchoPagina * 0.02;

  // Filas candidatas a ítem: tienen texto real a la izquierda y ≥2 números.
  const candidatas = conWords.filter((l) => {
    if (SALTAR.test(l.text)) return false;
    const nums = l.words!.filter(esNumerica);
    const letras = l.words!.some((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}/.test(w.text));
    return nums.length >= 2 && letras;
  });
  if (candidatas.length < 2) return null;

  // Columnas: bordes derechos de los números de las filas candidatas.
  const xs: number[] = [];
  for (const l of candidatas) for (const w of l.words!.filter(esNumerica)) xs.push(w.bbox.x1);
  const centros = agruparColumnas(xs, umbral);
  if (centros.length < 2) return null;

  // Asignar cada número de cada fila a su columna más cercana.
  const columnas: Columna[] = centros.map((x) => ({ x, valores: [] }));
  const filas: { linea: OCRLine; porColumna: (number | null)[]; descripcion: string }[] = [];
  for (const l of candidatas) {
    const porColumna: (number | null)[] = centros.map(() => null);
    let xPrimeraCol = Infinity;
    for (const w of l.words!) {
      if (!esNumerica(w)) continue;
      let mejor = 0;
      for (let c = 1; c < centros.length; c++) {
        if (Math.abs(w.bbox.x1 - centros[c]) < Math.abs(w.bbox.x1 - centros[mejor])) mejor = c;
      }
      if (Math.abs(w.bbox.x1 - centros[mejor]) > umbral * 1.5) continue; // fuera de toda columna
      const v = parseMontoUniversal(w.text)?.valor ?? null;
      if (v === null) continue;
      porColumna[mejor] = v;
      columnas[mejor].valores.push(v);
      if (w.bbox.x0 < xPrimeraCol) xPrimeraCol = w.bbox.x0;
    }
    // Descripción: palabras completamente a la izquierda del primer número asignado.
    const descripcion = l.words!
      .filter((w) => w.bbox.x1 < xPrimeraCol - umbral * 0.5 && !esNumerica(w))
      .map((w) => w.text)
      .join(' ')
      .trim();
    if (porColumna.filter((v) => v !== null).length >= 2 && descripcion.length >= 3) {
      filas.push({ linea: l, porColumna, descripcion });
    }
  }
  if (filas.length < 2) return null;

  // Roles: la columna más a la derecha con datos = total. Una columna de
  // enteros chicos (<1000) = cantidad. La columna con datos más a la derecha
  // (sin contar total) = precio unitario.
  const conDatos = columnas
    .map((c, i) => ({ i, c }))
    .filter(({ c }) => c.valores.length >= Math.max(2, filas.length * 0.5));
  if (conDatos.length < 2) return null;
  const idxTotal = conDatos[conDatos.length - 1].i;
  const esColCantidad = (c: Columna) =>
    c.valores.every((v) => Number.isInteger(v) && v > 0 && v < 1000);
  let idxCantidad = -1;
  for (const { i, c } of conDatos) {
    if (i !== idxTotal && esColCantidad(c)) {
      idxCantidad = i;
      break;
    }
  }
  let idxPrecio = -1;
  for (let k = conDatos.length - 2; k >= 0; k--) {
    const { i } = conDatos[k];
    if (i !== idxTotal && i !== idxCantidad) {
      idxPrecio = i;
      break;
    }
  }

  const items: ItemDocumento[] = [];
  for (const f of filas) {
    const total = f.porColumna[idxTotal];
    if (total === null || !(total > 0)) continue;
    const cantidad = idxCantidad >= 0 ? f.porColumna[idxCantidad] ?? 1 : 1;
    let precio = idxPrecio >= 0 ? f.porColumna[idxPrecio] ?? 0 : 0;
    if (!(precio > 0)) precio = cantidad > 0 ? Math.round(total / cantidad) : total;
    // Confianza de la fila: la del OCR de la línea, con premio si la aritmética
    // cierra (cantidad × precio ≈ total dentro de 2%) — señal de fila real.
    const cierra = Math.abs(cantidad * precio - total) <= Math.max(2, total * 0.02);
    const confianza = Math.min(1, (f.linea.confidence || 0.5) + (cierra ? 0.2 : 0));
    items.push({
      descripcion: f.descripcion.slice(0, 120),
      cantidad: cantidad > 0 ? cantidad : 1,
      precio,
      total,
      confianza,
    });
    if (items.length >= 60) break; // techo de seguridad
  }
  return items.length >= 2 ? items : null;
}
