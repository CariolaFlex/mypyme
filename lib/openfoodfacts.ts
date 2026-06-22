/**
 * Lookup de producto por código de barras (EAN/UPC) contra las bases abiertas de
 * la Open Food Facts Foundation (multi-fuente):
 *   - Open Food Facts    → comida y bebida
 *   - Open Products Facts → productos generales (no comida)
 *   - Open Beauty Facts   → cosmética / higiene
 *
 * Todas son públicas, gratis, sin key y con CORS abierto → se llaman desde el
 * navegador. Cobertura chilena IRREGULAR (mejor en comida internacional). Para
 * cobertura seria de ferretería/electrónica/etc. haría falta una API de pago vía
 * endpoint server-side (decisión de negocio). Best-effort: si nada matchea o falla
 * la red, devuelve null y el flujo sigue igual (el código igual queda guardado).
 */

export interface ProductoExterno {
  nombre?: string;
  marca?: string;
  cantidad?: string; // ej. "900 ml"
  unidad?: string; // derivada de cantidad si se reconoce
  imagen?: string;
  fuente?: string; // de qué base salió (diagnóstico)
}

const UNIDADES_CONOCIDAS = ['ml', 'l', 'g', 'kg', 'mg', 'cc', 'oz'];

// Orden de consulta: lo más probable para un almacén primero.
const FUENTES: { base: string; nombre: string }[] = [
  { base: 'https://world.openfoodfacts.org', nombre: 'Open Food Facts' },
  { base: 'https://world.openproductsfacts.org', nombre: 'Open Products Facts' },
  { base: 'https://world.openbeautyfacts.org', nombre: 'Open Beauty Facts' },
];

function derivarUnidad(cantidad?: string): string | undefined {
  if (!cantidad) return undefined;
  const m = cantidad.toLowerCase().match(/\b(ml|kg|mg|cc|oz|g|l)\b/);
  if (!m) return undefined;
  const u = m[1] === 'l' ? 'L' : m[1];
  return UNIDADES_CONOCIDAS.includes(u.toLowerCase()) ? u : undefined;
}

async function consultarFuente(
  base: string,
  nombreFuente: string,
  code: string
): Promise<ProductoExterno | null> {
  try {
    const url = `${base}/api/v2/product/${encodeURIComponent(
      code
    )}.json?fields=product_name,brands,quantity,image_front_url`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1 || !json.product) return null;

    const p = json.product;
    const nombre = (p.product_name as string | undefined)?.trim() || undefined;
    const marca = (p.brands as string | undefined)?.split(',')[0]?.trim() || undefined;
    const cantidad = (p.quantity as string | undefined)?.trim() || undefined;
    if (!nombre && !marca) return null;

    return {
      nombre,
      marca,
      cantidad,
      unidad: derivarUnidad(cantidad),
      imagen: (p.image_front_url as string | undefined) || undefined,
      fuente: nombreFuente,
    };
  } catch {
    return null;
  }
}

export async function buscarPorCodigo(code: string): Promise<ProductoExterno | null> {
  // Comida primero (lo más común en un almacén). Si no hay match, las otras dos
  // en paralelo y se usa la primera que traiga datos.
  const [primera, ...resto] = FUENTES;
  const hit = await consultarFuente(primera.base, primera.nombre, code);
  if (hit) return hit;

  const settled = await Promise.allSettled(
    resto.map((f) => consultarFuente(f.base, f.nombre, code))
  );
  for (const r of settled) if (r.status === 'fulfilled' && r.value) return r.value;
  return null;
}
