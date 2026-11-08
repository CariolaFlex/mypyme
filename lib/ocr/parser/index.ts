/**
 * DocumentParser central: clasifica el tipo de documento, delega a la
 * estrategia especializada y hace la cross-validation aritmética, entregando
 * un DocumentoExtraido con confianza por campo (la UI resalta lo dudoso).
 *
 * El shape persistido sigue siendo FacturaExtraida (aFacturaExtraida) — el
 * parser es un asistente, no un oráculo: el usuario siempre revisa y corrige.
 */

import type {
  DocumentoExtraido,
  FacturaExtraida,
  OCRRaw,
  ParserContext,
  TipoDocOCR,
  TipoDocumento,
} from '../types';
import { clasificarDocumento } from '../clasificador';
import { detectarMoneda } from '../montos';
import { itemsPorCuentasGestionala } from '../items-cuentas';
import { completarIva } from '../compras';
import {
  estrategiaFactura,
  estrategiaServicio,
  estrategiaTicket,
  type ResultadoEstrategia,
} from './estrategias';

/** El selector de la UI ("¿qué vas a escanear?") manda cuando el clasificador
 *  no está seguro: el usuario tiene el papel en la mano. */
function resolverTipo(clasificado: TipoDocumento, confianza: number, hint?: TipoDocOCR): TipoDocumento {
  if (!hint || hint === 'otro') return clasificado;
  if (confianza >= 0.45) return clasificado;
  return hint;
}

/** Tipo universal → tipo del flujo tributario histórico (para la estrategia
 *  factura, que deriva IVA distinto en boletas/guías). */
function aTipoDocOCR(tipo: TipoDocumento): TipoDocOCR {
  if (tipo === 'boleta') return 'boleta';
  if (tipo === 'guia') return 'guia';
  if (tipo === 'factura' || tipo === 'nota_credito') return 'factura';
  return 'otro';
}

export function parseDocument(raw: OCRRaw, ctx: ParserContext = {}): DocumentoExtraido {
  const clasif = clasificarDocumento(raw);
  const tipo = resolverTipo(clasif.tipo, clasif.confianza, ctx.tipoDocumento);
  const moneda = detectarMoneda(raw.fullText, 'CLP');

  let res: ResultadoEstrategia;
  switch (tipo) {
    case 'ticket':
      res = estrategiaTicket(raw, ctx);
      break;
    case 'presupuesto':
    case 'cotizacion':
    case 'recibo':
      res = estrategiaServicio(raw, ctx);
      break;
    default:
      // factura / boleta / guia / nota_credito / otro → parser formal (histórico).
      res = estrategiaFactura(raw, aTipoDocOCR(tipo));
  }

  // ── Líneas guiadas por las cuentas (motor de Vectium) ───────────────────
  // Prueba las lecturas posibles de cada fila (cantidad, unidad, precio, descuento,
  // total) y elige la que cierra. Se usa si su suma cuadra mejor con el neto (o el
  // total) que las líneas de la estrategia. Lee también «600,00 ENVASE … 85,81 51.486».
  {
    const porCuentas = itemsPorCuentasGestionala(raw.lines);
    const meta = res.neto.valor > 0 ? res.neto.valor : res.total.valor;
    const dist = (xs: { total: number }[]) => (xs.length ? Math.abs(xs.reduce((s, x) => s + (x.total || 0), 0) - meta) : Infinity);
    // Cuántas líneas cierran su propia cuenta (cantidad × precio = total): desempata cuando las dos sumas cuadran.
    const cierran = (xs: { cantidad: number; precio: number; total: number }[]) =>
      xs.filter((x) => Math.abs(x.cantidad * x.precio - x.total) <= Math.max(2, Math.abs(x.total) * 0.005)).length;
    const dc = dist(porCuentas.items);
    const dr = dist(res.items);
    if (meta > 0 && porCuentas.items.length && (dc < dr || (dc === dr && porCuentas.cierran > cierran(res.items))))
      res.items = porCuentas.items;
  }

  // ── IVA no leído: si neto + IVA tiene que dar el total, se completa ─────
  // (antes quedaba IVA 0 y la factura se guardaba como exenta: se perdía el crédito fiscal).
  {
    const c = completarIva({ neto: res.neto.valor, iva: res.iva.valor, total: res.total.valor }, ctx.tasaIva ?? 19);
    if (c && c.iva !== res.iva.valor) res.iva = { valor: c.iva, confianza: 0.85, fuente: 'derivado' };
  }

  // ── Cross-validation aritmética ─────────────────────────────────────────
  // CLP/COP operan en enteros (tolerancia ±2 por redondeos, la misma de la UI);
  // monedas con decimales toleran ±0.05.
  const tol = moneda === 'CLP' || moneda === 'COP' || moneda === 'OTRA' ? 2 : 0.05;
  const total = res.total.valor;
  const sumaItems = res.items.reduce((a, it) => a + (it.total || 0), 0);
  const cuadraIvaTotal = total > 0 && Math.abs(res.neto.valor + res.iva.valor - total) <= tol;
  const cuadraItemsTotal =
    sumaItems > 0 &&
    total > 0 &&
    // Los ítems pueden venir netos (sin IVA): cuadrar contra total O contra neto.
    (Math.abs(sumaItems - total) <= tol || Math.abs(sumaItems - res.neto.valor) <= tol);

  // El cuadre ajusta la confianza: aritmética que cierra = señal fuerte de que
  // el OCR leyó bien; que no cierra = alguien tiene que mirar esos campos.
  const boost = (c: number) => Math.min(0.98, c + 0.05);
  const castigo = (c: number) => c * 0.8;
  if (cuadraIvaTotal && cuadraItemsTotal) {
    res.total.confianza = boost(res.total.confianza);
    res.neto.confianza = boost(res.neto.confianza);
    res.iva.confianza = boost(res.iva.confianza);
  } else if (!cuadraIvaTotal && total > 0) {
    res.total.confianza = castigo(res.total.confianza);
    res.neto.confianza = castigo(res.neto.confianza);
    res.iva.confianza = castigo(res.iva.confianza);
  }

  return {
    tipo,
    tipoConfianza: clasif.confianza,
    moneda,
    taxId: res.taxId,
    emisor: res.emisor,
    folio: res.folio,
    fecha: res.fecha,
    neto: res.neto,
    iva: res.iva,
    total: res.total,
    items: res.items,
    validacion: { cuadraIvaTotal, cuadraItemsTotal, sumaItems },
  };
}

/** Aplana el documento con confianzas al shape que persiste ocr_scans.datos y
 *  consume el flujo de Cuentas por pagar (retrocompatibilidad total). */
export function aFacturaExtraida(doc: DocumentoExtraido): FacturaExtraida {
  return {
    rut: doc.taxId.valor,
    razonSocial: doc.emisor.valor,
    folio: doc.folio.valor,
    fecha: doc.fecha.valor,
    neto: doc.neto.valor,
    iva: doc.iva.valor,
    total: doc.total.valor,
    // ItemDocumento extiende ItemFactura: unidad/confianza extra no molestan al
    // guardar (JSON), pero se recortan acá para mantener el shape limpio.
    items: doc.items.map(({ descripcion, cantidad, precio, total }) => ({
      descripcion,
      cantidad,
      precio,
      total,
    })),
  };
}
