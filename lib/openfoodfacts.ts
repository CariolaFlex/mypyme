/**
 * Lookup de producto por código de barras (EAN/UPC) contra Open Food Facts.
 *
 * API pública, gratis, sin key, con CORS abierto → se llama desde el navegador.
 * Cobertura chilena IRREGULAR: muchos códigos no traen datos (sobre todo no-comida).
 * Best-effort: si no hay match o falla la red, devuelve null y el flujo sigue igual.
 */

export interface ProductoExterno {
  nombre?: string;
  marca?: string;
  cantidad?: string; // ej. "900 ml"
  unidad?: string; // derivada de cantidad si se reconoce
  imagen?: string;
}

const UNIDADES_CONOCIDAS = ['ml', 'l', 'g', 'kg', 'mg', 'cc', 'oz'];

function derivarUnidad(cantidad?: string): string | undefined {
  if (!cantidad) return undefined;
  const m = cantidad.toLowerCase().match(/\b(ml|kg|mg|cc|oz|g|l)\b/);
  if (!m) return undefined;
  const u = m[1] === 'l' ? 'L' : m[1];
  return UNIDADES_CONOCIDAS.includes(u.toLowerCase()) ? u : undefined;
}

export async function buscarPorCodigo(code: string): Promise<ProductoExterno | null> {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
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

    return { nombre, marca, cantidad, unidad: derivarUnidad(cantidad), imagen: p.image_front_url || undefined };
  } catch {
    return null;
  }
}
