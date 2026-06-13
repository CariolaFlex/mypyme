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

export async function crearMetodo(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/configuracion/metodos-pago?error=Nombre requerido');

  const { error } = await supabase.from('metodos_pago').insert({
    empresa_id: empresaId,
    nombre,
    tipo: String(formData.get('tipo') ?? 'other'),
  });
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un método con ese nombre' : error.message;
    redirect(`/configuracion/metodos-pago?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/configuracion/metodos-pago');
  redirect('/configuracion/metodos-pago?ok=1');
}

export async function toggleMetodo(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const activo = formData.get('activo') === 'true';
  const { error } = await supabase.from('metodos_pago').update({ activo: !activo }).eq('id', id);
  if (error) redirect(`/configuracion/metodos-pago?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/configuracion/metodos-pago');
  redirect('/configuracion/metodos-pago?ok=1');
}
