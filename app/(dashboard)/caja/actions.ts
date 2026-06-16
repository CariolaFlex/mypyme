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
  // El POS se habilita/bloquea según haya caja abierta.
  revalidatePath('/pos');
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
  // El POS se habilita/bloquea según haya caja abierta.
  revalidatePath('/pos');
  redirect('/caja?ok=cerrada');
}

// Entrada/salida manual de efectivo (ej. retiro a banco, fondo de cambio).
// Inserta directo en movimientos_caja bajo RLS; el signo lo fija el tipo.
export async function registrarMovimientoCaja(formData: FormData) {
  const sesionId = String(formData.get('sesion_id') ?? '');
  const tipo = String(formData.get('tipo') ?? '');
  const montoAbs = Math.abs(Number(formData.get('monto') ?? 0));
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null;

  if (!sesionId || montoAbs <= 0 || (tipo !== 'entrada_manual' && tipo !== 'salida_manual')) {
    redirect(`/caja?error=${encodeURIComponent('Monto o tipo inválido')}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const empresaId = (claimsData?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;

  const { error } = await supabase.from('movimientos_caja').insert({
    empresa_id: empresaId,
    sesion_caja_id: sesionId,
    tipo,
    monto: tipo === 'salida_manual' ? -montoAbs : montoAbs,
    descripcion,
  });
  if (error) redirect(`/caja?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/caja');
  redirect('/caja?ok=movimiento');
}
