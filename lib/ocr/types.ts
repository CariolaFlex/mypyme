/** Tipos del módulo OCR (motor universal de documentos comerciales). */

/** Tipo de documento que el usuario indica antes de escanear (ajusta la heurística
 *  y el tipo_documento tributario de la factura registrada). Se mantiene por
 *  retrocompatibilidad con el flujo actual de compras. */
export type TipoDocOCR = 'factura' | 'boleta' | 'guia' | 'otro';

/** Tipo de documento comercial que el clasificador puede detectar. Superset de
 *  TipoDocOCR: cubre docs informales (ticket, presupuesto) que igual se registran. */
export type TipoDocumento =
  | 'factura'
  | 'boleta'
  | 'ticket'
  | 'guia'
  | 'presupuesto'
  | 'cotizacion'
  | 'recibo'
  | 'nota_credito'
  | 'otro';

/** Monedas soportadas por el parser de montos. 'OTRA' = símbolo no reconocido
 *  (se parsea igual el número; la moneda queda a criterio del usuario). */
export type Moneda = 'CLP' | 'USD' | 'EUR' | 'COP' | 'MXN' | 'PEN' | 'BRL' | 'UF' | 'OTRA';

export interface OCRProgress {
  step: 'loading' | 'ocr' | 'analyzing' | 'done';
  message: string;
  percent: number; // 0-100
}

/** Caja delimitadora en píxeles de la imagen procesada (coordenadas Tesseract). */
export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Palabra individual con posición: base de la detección de columnas y de la
 *  extracción de ítems por proximidad espacial. */
export interface OCRWord {
  text: string;
  confidence: number; // 0-1
  bbox: BBox;
}

export interface OCRLine {
  text: string;
  confidence: number;
  /** Palabras con coordenadas (solo si el engine pudo pedir blocks a Tesseract). */
  words?: OCRWord[];
  bbox?: BBox;
}

export interface OCREntity {
  label: 'TAX_ID' | 'MONEY' | 'DATE' | 'ORGANIZATION' | 'EMAIL' | 'PHONE';
  text: string;
  normalized?: string;
  /** País del identificador tributario detectado ('CL', 'CO', 'MX', 'PE', 'BR')
   *  o undefined para el genérico. Solo aplica a TAX_ID. */
  pais?: string;
}

/** Resultado crudo del OCR (texto + líneas + entidades). */
export interface OCRRaw {
  fullText: string;
  lines: OCRLine[];
  entities: OCREntity[];
  avgConfidence: number;
  /** Nombre de la variante de preprocesado ganadora (diagnóstico). */
  variante?: string;
}

/** Una línea de detalle de la factura. */
export interface ItemFactura {
  descripcion: string;
  cantidad: number;
  precio: number; // unitario
  total: number;
}

/** Ítem del documento universal: agrega unidad (horas, m², kg…) y confianza.
 *  Extiende ItemFactura para que el shape persistido siga siendo compatible. */
export interface ItemDocumento extends ItemFactura {
  /** Unidad de medida detectada ('un', 'kg', 'hr', 'm2', 'm3', …). */
  unidad?: string;
  /** 0-1: qué tan segura fue la extracción de esta fila. */
  confianza?: number;
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

/** Un valor extraído + la confianza (0-1) de esa extracción. La UI usa la
 *  confianza para resaltar lo dudoso; el usuario siempre revisa antes de guardar. */
export interface CampoExtraido<T> {
  valor: T;
  confianza: number;
  /** De dónde salió el valor ('etiqueta', 'entidad', 'letra', 'suma_items',
   *  'derivado', 'fallback') — diagnóstico y debugging. */
  fuente?: string;
}

/** Resultado del cross-check aritmético del documento. */
export interface ValidacionDocumento {
  /** |neto + iva − total| ≤ tolerancia. */
  cuadraIvaTotal: boolean;
  /** |suma de ítems − total| ≤ tolerancia (o ≈ neto si los ítems van sin IVA). */
  cuadraItemsTotal: boolean;
  sumaItems: number;
}

/** Documento comercial extraído con confianza por campo. Es el resultado del
 *  DocumentParser; se convierte a FacturaExtraida para persistir (retrocompat). */
export interface DocumentoExtraido {
  tipo: TipoDocumento;
  /** Confianza de la clasificación del tipo (0-1). */
  tipoConfianza: number;
  moneda: Moneda;
  taxId: CampoExtraido<string>;
  emisor: CampoExtraido<string>;
  folio: CampoExtraido<string>;
  fecha: CampoExtraido<string>; // ISO o ''
  neto: CampoExtraido<number>;
  iva: CampoExtraido<number>;
  total: CampoExtraido<number>;
  items: ItemDocumento[];
  validacion: ValidacionDocumento;
}

/** Tipo de negocio declarado en el onboarding/configuración. Ajusta el
 *  comportamiento del parser (IVA, unidades, conceptos de servicio). */
export type TipoNegocio =
  | 'minimarket'
  | 'restaurante'
  | 'ferreteria'
  | 'farmacia'
  | 'servicio_tecnico'
  | 'construccion'
  | 'arriendo'
  | 'profesional'
  | 'otro';

/** Contexto que la app inyecta al DocumentParser (perfil del negocio). */
export interface ParserContext {
  tipoNegocio?: TipoNegocio;
  /** Si el negocio opera con IVA (de configuracion_negocio.usa_iva). */
  usaIva?: boolean;
  /** Tasa de IVA default en % (19 en Chile). */
  tasaIva?: number;
  /** Pista del usuario sobre el tipo de documento (selector de la UI). */
  tipoDocumento?: TipoDocOCR;
}
