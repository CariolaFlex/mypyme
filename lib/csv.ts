// Construcción de CSV para Excel es-CL.
// - Delimitador ';' : en locale es-CL la coma es separador decimal, así que Excel
//   espera ';' como separador de campos (si usáramos ',' rompería las columnas).
// - Montos como enteros crudos (sin símbolo ni separador de miles) → Excel los
//   trata como números, no como texto.
// - Siempre con BOM (U+FEFF, regla del proyecto) y saltos CRLF (Excel los prefiere).

type Cell = string | number | null | undefined;

function escape(v: Cell): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Si contiene comillas, el delimitador o saltos de línea → entrecomillar y duplicar comillas.
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Convierte filas en un string CSV con BOM, delimitador ';' y CRLF. */
export function toCsv(rows: Cell[][]): string {
  const body = rows.map((r) => r.map(escape).join(';')).join('\r\n');
  return '﻿' + body;
}

/** Respuesta HTTP de descarga (attachment) con el CSV ya construido. */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Helper: número crudo para celdas de monto/cantidad (null/undefined → 0). */
export const n = (v: unknown): number => Number(v ?? 0);
