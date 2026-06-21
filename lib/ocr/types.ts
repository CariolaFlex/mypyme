/** Tipos del módulo OCR (adaptado de LegisEnterprise al contexto de facturas). */

/** Tipo de documento que el usuario indica antes de escanear (ajusta la heurística
 *  y el tipo_documento tributario de la factura registrada). */
export type TipoDocOCR = 'factura' | 'boleta' | 'guia' | 'otro';

export interface OCRProgress {
  step: 'loading' | 'ocr' | 'analyzing' | 'done';
  message: string;
  percent: number; // 0-100
}

export interface OCRLine {
  text: string;
  confidence: number;
}

export interface OCREntity {
  label: 'TAX_ID' | 'MONEY' | 'DATE' | 'ORGANIZATION' | 'EMAIL' | 'PHONE';
  text: string;
  normalized?: string;
}

/** Resultado crudo del OCR (texto + líneas + entidades). */
export interface OCRRaw {
  fullText: string;
  lines: OCRLine[];
  entities: OCREntity[];
  avgConfidence: number;
}

/** Una línea de detalle de la factura. */
export interface ItemFactura {
  descripcion: string;
  cantidad: number;
  precio: number; // unitario
  total: number;
}

/** Datos estructurados extraídos de una factura (todos editables por el usuario). */
export interface FacturaExtraida {
  rut: string;
  razonSocial: string;
  folio: string;
  fecha: string; // 'YYYY-MM-DD' o ''
  neto: number;
  iva: number;
  total: number;
  items: ItemFactura[];
}
