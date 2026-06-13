'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

  // Subir imagen (opcional) a Storage en la carpeta del tenant.
  let imagenUrl: string | null = null;
  const file = formData.get('imagen');
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${empresaId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('productos')
      .upload(path, file, { contentType: file.type || 'image/jpeg' });
    if (!upErr) {
      imagenUrl = supabase.storage.from('productos').getPublicUrl(path).data.publicUrl;
    }
  }

  const { error } = await supabase.from('productos').insert({
    empresa_id: empresaId,
    sku: String(formData.get('sku') ?? '').trim(),
    nombre: String(formData.get('nombre') ?? '').trim(),
    categoria_id: categoriaId || null,
    precio_total: precioTotal,
    precio_neto: precioNeto,
    tasa_iva: tasaIva,
    stock_minimo: stockMin ? Number(stockMin) : null,
    imagen_url: imagenUrl,
  });

  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un producto con ese SKU' : error.message;
    redirect(`/inventario/productos?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/inventario/productos');
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
