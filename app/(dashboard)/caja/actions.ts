'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function abrirCaja(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('abrir_caja', {
    p_monto_apertura: Number(formData.get('monto_apertura') ?? 0),
  });
  if (error) redirect(`/caja?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/caja');
  redirect('/caja?ok=abierta');
}

export async function cerrarCaja(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc('cerrar_caja', {
    p_sesion_id: String(formData.get('sesion_id') ?? ''),
    p_monto_contado: Number(formData.get('monto_contado') ?? 0),
  });
  if (error) redirect(`/caja?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/caja');
  redirect('/caja?ok=cerrada');
}
