'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Mensaje amistoso para violaciones de unicidad (SKU vs código de barras). */
function mensajeError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    return (error.message ?? '').includes('codigo_barras')
      ? 'Ya existe un producto con ese código de barras'
      : 'Ya existe un producto con ese SKU';
  }
  return error.message ?? 'No se pudo guardar el producto';
}

async function getEmpresaId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  return { supabase, empresaId };
}

export async function crearProducto(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const precioTotal = Number(formData.get('precio_total') ?? 0);
  const tasaIva = Number(formData.get('tasa_iva') ?? 0);
  // precio_total incluye IVA → derivar neto.
  const precioNeto = tasaIva > 0 ? Math.round((precioTotal / (1 + tasaIva / 100)) * 100) / 100 : precioTotal;

  const categoriaId = String(formData.get('categoria_id') ?? '');
  const stockMin = formData.get('stock_minimo');

  // La imagen se sube DIRECTO a Storage desde el navegador (ver imagen-producto.tsx):
  // el form solo trae la URL pública. Así la foto del celular no pasa por la server
  // action (su límite de body es 1MB → las fotos de móvil la hacían crashear).
  const imagenUrl = String(formData.get('imagen_url') ?? '').trim() || null;

  const codigoBarras = String(formData.get('codigo_barras') ?? '').trim();
  const unidadMedida = String(formData.get('unidad_medida') ?? '').trim() || 'unidad';
  const stockInicialRaw = formData.get('stock_inicial');
  const stockInicial = stockInicialRaw ? Number(stockInicialRaw) : 0;

  const { data: prod, error } = await supabase
    .from('productos')
    .insert({
      empresa_id: empresaId,
      sku: String(formData.get('sku') ?? '').trim(),
      nombre: String(formData.get('nombre') ?? '').trim(),
      codigo_barras: codigoBarras || null,
      categoria_id: categoriaId || null,
      unidad_medida: unidadMedida,
      precio_total: precioTotal,
      precio_neto: precioNeto,
      tasa_iva: tasaIva,
      stock_minimo: stockMin ? Number(stockMin) : null,
      imagen_url: imagenUrl,
    })
    .select('id')
    .single();

  if (error) {
    redirect(`/inventario/productos?error=${encodeURIComponent(mensajeError(error))}`);
  }

  // Stock inicial (opcional): registra un movimiento de ajuste en la bodega
  // por defecto, igual que el import masivo.
  if (stockInicial > 0 && prod?.id) {
    const { data: bodega } = await supabase
      .from('bodegas')
      .select('id')
      .order('es_default', { ascending: false })
      .order('creado_en', { ascending: true })
      .limit(1)
      .single();
    if (bodega?.id) {
      await supabase.from('movimientos_inventario').insert({
        empresa_id: empresaId,
        producto_id: prod.id,
        bodega_id: bodega.id,
        cantidad: stockInicial,
        tipo: 'ajuste',
      });
    }
  }

  revalidatePath('/inventario/productos');
  revalidatePath('/inventario/stock');
  redirect('/inventario/productos?ok=1');
}

/** Crea una categoría desde el formulario de producto y devuelve su id/nombre. */
export async function crearCategoriaRapida(
  nombre: string
): Promise<{ id: string; nombre: string } | { error: string }> {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) return { error: 'Sesión expirada' };
  const limpio = nombre.trim();
  if (!limpio) return { error: 'Escribe un nombre' };

  const { data, error } = await supabase
    .from('categorias_producto')
    .insert({ empresa_id: empresaId, nombre: limpio })
    .select('id, nombre')
    .single();

  if (error) {
    return { error: error.code === '23505' ? 'Ya existe esa categoría' : error.message };
  }
  revalidatePath('/inventario/productos');
  revalidatePath('/inventario/categorias');
  return { id: data.id, nombre: data.nombre };
}

export async function editarProducto(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const precioTotal = Number(formData.get('precio_total') ?? 0);
  const tasaIva = Number(formData.get('tasa_iva') ?? 0);
  const precioNeto = tasaIva > 0 ? Math.round((precioTotal / (1 + tasaIva / 100)) * 100) / 100 : precioTotal;
  const categoriaId = String(formData.get('categoria_id') ?? '');
  const stockMin = formData.get('stock_minimo');
  const codigoBarras = String(formData.get('codigo_barras') ?? '').trim();

  const { error } = await supabase
    .from('productos')
    .update({
      sku: String(formData.get('sku') ?? '').trim(),
      nombre: String(formData.get('nombre') ?? '').trim(),
      codigo_barras: codigoBarras || null,
      categoria_id: categoriaId || null,
      precio_total: precioTotal,
      precio_neto: precioNeto,
      tasa_iva: tasaIva,
      stock_minimo: stockMin ? Number(stockMin) : null,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    redirect(`/inventario/productos?error=${encodeURIComponent(mensajeError(error))}`);
  }
  revalidatePath('/inventario/productos');
  revalidatePath('/inventario/stock');
  redirect('/inventario/productos?ok=1');
}

export async function eliminarProducto(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');

  // No se puede borrar un producto con historial financiero/de compras
  // (ventas u órdenes lo referencian con FK RESTRICT). En ese caso se archiva
  // (desactiva). Los movimientos de inventario caen por CASCADE.
  const [{ count: ventas }, { count: ordenes }] = await Promise.all([
    supabase.from('ventas_lineas').select('id', { count: 'exact', head: true }).eq('producto_id', id),
    supabase.from('ordenes_compra_lineas').select('id', { count: 'exact', head: true }).eq('producto_id', id),
  ]);

  if ((ventas ?? 0) > 0 || (ordenes ?? 0) > 0) {
    redirect(
      `/inventario/productos?error=${encodeURIComponent(
        'No se puede eliminar: el producto tiene ventas u órdenes asociadas. Desactívalo para ocultarlo sin perder el historial.'
      )}`
    );
  }

  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) redirect(`/inventario/productos?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/inventario/productos');
  revalidatePath('/inventario/stock');
  redirect('/inventario/productos?ok=1');
}

export async function toggleActivo(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const activo = formData.get('activo') === 'true';
  const { error } = await supabase
    .from('productos')
    .update({ activo: !activo, actualizado_en: new Date().toISOString() })
    .eq('id', id);

  if (error) redirect(`/inventario/productos?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/inventario/productos');
  redirect('/inventario/productos?ok=1');
}
