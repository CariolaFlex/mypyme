'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Item = { nombre: string; precio_total: number; categoria: string | null; stock: number | null };

const back = (qs: string) => redirect(`/inventario/importar?${qs}`);

/** Detecta el separador de una línea: ';' > tab > ','. */
function separador(linea: string): string {
  if (linea.includes(';')) return ';';
  if (linea.includes('\t')) return '\t';
  return ',';
}

/** Precio CLP pegado ("$2.500", "2.500", "2500") → entero. */
function parsePrecio(s: string): number | null {
  const limpio = s.replace(/[^\d]/g, '');
  if (limpio === '') return null;
  return Number(limpio);
}

/** Stock ("20", "1,5") → número, o null si vacío. */
function parseStock(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export async function importarCatalogo(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  if (!claims?.empresa_id) redirect('/onboarding');
  if (claims?.user_rol !== 'admin') back('error=' + encodeURIComponent('Solo un administrador puede importar'));

  const texto = String(formData.get('datos') ?? '');
  const lineas = texto.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  if (lineas.length === 0) back('error=' + encodeURIComponent('Pega al menos una línea'));

  // Saltar encabezado si la primera línea parece títulos (sin precio numérico).
  const primera = lineas[0].toLowerCase();
  const hayHeader = primera.includes('nombre') && (primera.includes('precio') || primera.includes('valor'));
  const filas = hayHeader ? lineas.slice(1) : lineas;
  if (filas.length === 0) back('error=' + encodeURIComponent('No hay productos bajo el encabezado'));

  const items: Item[] = [];
  for (let i = 0; i < filas.length; i++) {
    const linea = filas[i];
    const sep = separador(linea);
    const cols = linea.split(sep).map((c) => c.trim());
    const nLinea = i + 1 + (hayHeader ? 1 : 0);

    const nombre = cols[0] ?? '';
    if (!nombre) back('error=' + encodeURIComponent(`Línea ${nLinea}: falta el nombre`));

    const precio = parsePrecio(cols[1] ?? '');
    if (precio === null) back('error=' + encodeURIComponent(`Línea ${nLinea} ("${nombre}"): precio inválido`));

    const categoria = (cols[2] ?? '').trim() || null;

    const stock = parseStock(cols[3] ?? '');
    if (Number.isNaN(stock)) back('error=' + encodeURIComponent(`Línea ${nLinea} ("${nombre}"): stock inválido`));

    items.push({ nombre, precio_total: precio!, categoria, stock });
  }

  const { data: res, error } = await supabase.rpc('importar_catalogo', { p_items: items });
  if (error) back('error=' + encodeURIComponent(error.message));

  const creados = (res as { creados?: number } | null)?.creados ?? 0;
  revalidatePath('/inventario/productos');
  back('ok=' + encodeURIComponent(`${creados} producto(s) importado(s)`));
}
