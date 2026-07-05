// Siembra el "kit inicial" de un rubro: categorías + fichas de ejemplo
// (servicios/productos). Reutilizable desde el onboarding y desde
// Configuración → Negocio. Idempotente: salta lo que ya existe por nombre, así
// re-ejecutarlo no duplica ni pisa un catálogo ya cargado.
import type { SupabaseClient } from '@supabase/supabase-js';
import { KIT_RUBRO } from '@/lib/tipos-negocio';
import type { TipoNegocio } from '@/lib/ocr/types';

const norm = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const sku = (nombre: string) =>
  (nombre.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'ITEM') +
  '-' +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export type ResultadoKit = { categorias: number; fichas: number };

/** Inserta el kit del rubro para la empresa. Devuelve cuántas categorías y
 *  fichas se crearon (0/0 si el rubro no tiene kit o ya estaba todo). */
export async function sembrarKitRubro(
  supabase: SupabaseClient,
  empresaId: string,
  tipo: TipoNegocio
): Promise<ResultadoKit> {
  const kit = KIT_RUBRO[tipo];
  if (!kit || kit.length === 0) return { categorias: 0, fichas: 0 };

  // IVA del negocio para derivar el neto de las fichas con precio.
  const { data: cfg } = await supabase
    .from('configuracion_negocio')
    .select('usa_iva, tasa_iva_default')
    .eq('empresa_id', empresaId)
    .maybeSingle();
  const usaIva = !!cfg?.usa_iva;
  const tasa = usaIva ? Number(cfg?.tasa_iva_default ?? 19) : 0;

  // Categorías existentes → mapa nombre normalizado → id (para no duplicar).
  const { data: catsExist } = await supabase
    .from('categorias_producto')
    .select('id, nombre')
    .eq('empresa_id', empresaId);
  const catId = new Map<string, string>();
  for (const c of catsExist ?? []) catId.set(norm(c.nombre), c.id);

  let categoriasCreadas = 0;
  const nuevasCats = kit
    .map((g) => g.categoria)
    .filter((nombre) => !catId.has(norm(nombre)));
  if (nuevasCats.length) {
    const { data: ins } = await supabase
      .from('categorias_producto')
      .insert(nuevasCats.map((nombre) => ({ empresa_id: empresaId, nombre })))
      .select('id, nombre');
    for (const c of ins ?? []) {
      catId.set(norm(c.nombre), c.id);
      categoriasCreadas++;
    }
  }

  // Productos existentes por nombre (para no duplicar fichas).
  const { data: prodsExist } = await supabase
    .from('productos')
    .select('nombre')
    .eq('empresa_id', empresaId);
  const prodNames = new Set((prodsExist ?? []).map((p) => norm(p.nombre)));

  const filas: Record<string, unknown>[] = [];
  for (const grupo of kit) {
    const categoria_id = catId.get(norm(grupo.categoria)) ?? null;
    for (const f of grupo.fichas) {
      if (f.precio == null) continue; // sin precio → solo categoría
      if (prodNames.has(norm(f.nombre))) continue;
      prodNames.add(norm(f.nombre));
      const precioTotal = f.precio;
      const precioNeto = tasa > 0 ? Math.round((precioTotal / (1 + tasa / 100)) * 100) / 100 : precioTotal;
      filas.push({
        empresa_id: empresaId,
        sku: sku(f.nombre),
        nombre: f.nombre,
        categoria_id,
        unidad_medida: 'unidad',
        controla_stock: !f.servicio,
        precio_total: precioTotal,
        precio_neto: precioNeto,
        tasa_iva: tasa,
      });
    }
  }

  let fichasCreadas = 0;
  if (filas.length) {
    const { data: ins } = await supabase.from('productos').insert(filas).select('id');
    fichasCreadas = ins?.length ?? 0;
  }

  return { categorias: categoriasCreadas, fichas: fichasCreadas };
}
