'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

async function getCtx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  return { supabase, empresaId };
}

export async function crearCategoriaGasto(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/gastos?error=Nombre requerido');

  const { error } = await supabase.from('categorias_gasto').insert({ empresa_id: empresaId, nombre });
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe una categoría con ese nombre' : error.message;
    redirect(`/gastos?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/gastos');
  redirect('/gastos?ok=1');
}

export async function editarCategoriaGasto(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/gastos?error=Nombre requerido');

  const { error } = await supabase.from('categorias_gasto').update({ nombre }).eq('id', id);
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe una categoría con ese nombre' : error.message;
    redirect(`/gastos?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/gastos');
  redirect('/gastos?ok=1');
}

export async function eliminarCategoriaGasto(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');

  // No se puede borrar una categoría usada por algún gasto (FK NOT NULL RESTRICT).
  const { count } = await supabase
    .from('gastos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_gasto_id', id);

  if ((count ?? 0) > 0) {
    redirect(
      `/gastos?error=${encodeURIComponent(
        'No se puede eliminar: hay gastos registrados con esta categoría. Reasígnalos antes de eliminarla.'
      )}`
    );
  }

  const { error } = await supabase.from('categorias_gasto').delete().eq('id', id);
  if (error) redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/gastos');
  redirect('/gastos?ok=1');
}
