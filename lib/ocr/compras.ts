/**
 * Reglas de compra para el flujo «Ingresar compra» (código puro, sin base de datos).
 *
 * Tomadas de la capa de integración de Vectium-SpA/motores (integracion/, 2026-11-08), que corrige lo que este
 * flujo hacía mal: IVA en $0 cuando el OCR no lo leía (la factura quedaba como exenta y se perdía el crédito fiscal),
 * proveedores duplicados por el RUT con o sin puntos, tasa recalculada desde iva/neto, y el total de una línea que no
 * se actualizaba al editar cantidad o precio.
 */

/** RUT canónico para comparar: «76.452.811-5», «764528115» y «76452811-5» → «76452811-5». */
export function rutClave(rut: string | null | undefined): string {
  const l = (rut ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
  return l.length >= 2 ? `${l.slice(0, -1)}-${l.slice(-1)}` : '';
}

/**
 * Completa el IVA cuando el OCR leyó neto y total pero no el IVA, solo si la cuenta lo confirma
 * (total − neto = tasa % del neto, ± $2). Devuelve null si no hay nada que completar o no cuadra.
 */
export function completarIva(m: { neto: number; iva: number; total: number }, tasaPct: number): { neto: number; iva: number; total: number } | null {
  if (!(m.neto > 0) || !(m.total > 0) || m.iva > 0 || !(tasaPct > 0)) return null;
  const iva = m.total - m.neto;
  return Math.abs(iva - Math.round((m.neto * tasaPct) / 100)) <= 2 ? { ...m, iva } : null;
}

/**
 * Al recibir el OCR (o reabrir un borrador): deja neto + IVA = total.
 * 1) Si falta el IVA y la cuenta lo confirma, lo completa.
 * 2) Si igual no cuadra, deriva neto e IVA desde el total (modo «Incluye IVA»): el total es el dato más confiable.
 */
export function cuadrarMontos(m: { neto: number; iva: number; total: number }, tasaPct: number): { neto: number; iva: number; total: number } {
  const c = completarIva(m, tasaPct);
  if (c) return c;
  if (m.total > 0 && Math.abs(m.neto + m.iva - m.total) > 2 && tasaPct > 0) {
    const neto = Math.round(m.total / (1 + tasaPct / 100));
    return { neto, iva: m.total - neto, total: m.total };
  }
  return m;
}

/** Tipo de documento para guardar, según lo elegido y el modo de IVA («Exento» → factura_exenta o boleta_exenta). */
export function tipoDocumentoCompra(tipo: 'factura' | 'boleta' | 'guia' | 'otro', modoIva: 'con' | 'sin' | 'exento'): string {
  if (tipo === 'factura') return modoIva === 'exento' ? 'factura_exenta' : 'factura';
  if (tipo === 'boleta') return modoIva === 'exento' ? 'boleta_exenta' : 'boleta';
  return 'sin_documento';
}
