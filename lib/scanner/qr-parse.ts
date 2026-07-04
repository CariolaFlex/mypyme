/**
 * Lectura inteligente de QR: el contenido puede ser una URL, un JSON
 * estructurado (etiquetas industriales) o texto plano. Además intenta extraer
 * un código de producto (GTIN/EAN) embebido — muchos QR de proveedores
 * envuelven el EAN en una URL o en un payload JSON.
 */

export interface QRParseado {
  tipo: 'url' | 'json' | 'texto';
  crudo: string;
  /** URL normalizada (solo tipo 'url'). */
  url?: string;
  /** Objeto parseado (solo tipo 'json'). */
  datos?: Record<string, unknown>;
  /** GTIN/EAN/UPC embebido si se pudo extraer (8, 12, 13 o 14 dígitos). */
  codigoProducto?: string;
}

/** Claves típicas donde las etiquetas JSON guardan el código de producto. */
const CLAVES_CODIGO = ['gtin', 'ean', 'ean13', 'upc', 'barcode', 'codigo_barras', 'codigo', 'sku'];

/** Un GTIN válido en largo (no valida dígito verificador: el usuario revisa). */
function esGTIN(s: string): boolean {
  return /^\d{8}$|^\d{12,14}$/.test(s);
}

/** Busca un GTIN dentro de un texto (path/query de URL, valores JSON). */
function buscarGTIN(texto: string): string | undefined {
  for (const m of texto.matchAll(/\d{8,14}/g)) {
    if (esGTIN(m[0])) return m[0];
  }
  return undefined;
}

export function parsearQR(crudo: string): QRParseado {
  const t = crudo.trim();

  // JSON estructurado (etiquetas industriales, apps propias).
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      const parsed: unknown = JSON.parse(t);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const datos = parsed as Record<string, unknown>;
        let codigoProducto: string | undefined;
        for (const clave of CLAVES_CODIGO) {
          const v = datos[clave] ?? datos[clave.toUpperCase()];
          if (typeof v === 'string' && esGTIN(v.trim())) {
            codigoProducto = v.trim();
            break;
          }
          if (typeof v === 'number' && esGTIN(String(v))) {
            codigoProducto = String(v);
            break;
          }
        }
        return { tipo: 'json', crudo: t, datos, codigoProducto };
      }
    } catch {
      /* no era JSON válido: cae a texto */
    }
  }

  // URL: extraer GTIN del path o la query si viene embebido.
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      return { tipo: 'url', crudo: t, url: u.href, codigoProducto: buscarGTIN(u.pathname + u.search) };
    } catch {
      /* URL malformada: cae a texto */
    }
  }

  // Texto plano: si ES un GTIN directo (el caso normal de un código de barras),
  // reportarlo como codigoProducto para que el caller no tenga que distinguir.
  return { tipo: 'texto', crudo: t, codigoProducto: esGTIN(t) ? t : undefined };
}
