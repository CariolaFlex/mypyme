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

export async function crearCategoria(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/inventario/categorias?error=Nombre requerido');

  const { error } = await supabase
    .from('categorias_producto')
    .insert({ empresa_id: empresaId, nombre });

  if (error) {
    const msg = error.code === '23505' ? 'Ya existe una categoría con ese nombre' : error.message;
    redirect(`/inventario/categorias?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/inventario/categorias');
  redirect('/inventario/categorias?ok=1');
}

export async function editarCategoria(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/inventario/categorias?error=Nombre requerido');

  const { error } = await supabase.from('categorias_producto').update({ nombre }).eq('id', id);
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe una categoría con ese nombre' : error.message;
    redirect(`/inventario/categorias?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/inventario/categorias');
  redirect('/inventario/categorias?ok=1');
}

export async function eliminarCategoria(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const { error } = await supabase.from('categorias_producto').delete().eq('id', id);
  if (error) redirect(`/inventario/categorias?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/inventario/categorias');
  redirect('/inventario/categorias?ok=1');
}
