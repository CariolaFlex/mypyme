'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function registrarGasto(formData: FormData) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const empresaId = (claims?.claims as Record<string, unknown> | undefined)?.empresa_id;
  if (!empresaId) redirect('/onboarding');

  const categoriaId = String(formData.get('categoria_gasto_id') ?? '');
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  const montoTotal = Number(formData.get('monto_total') ?? 0);
  const tasaIva = Number(formData.get('tasa_iva') ?? 0);
  const proveedorId = String(formData.get('proveedor_id') ?? '') || null;
  const fecha = String(formData.get('fecha') ?? '') || null;
  const pagarEfectivo = String(formData.get('pagar_efectivo') ?? '') === 'on';

  if (!categoriaId || !descripcion || montoTotal <= 0) {
    redirect('/gastos?error=Completa categoría, descripción y monto');
  }

  // Si se paga en efectivo, necesitamos una caja abierta.
  let sesionId: string | null = null;
  if (pagarEfectivo) {
    const { data: sesion } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('estado', 'abierta')
      .maybeSingle();
    if (!sesion) {
      redirect('/gastos?error=' + encodeURIComponent('No hay caja abierta para pagar en efectivo'));
    }
    sesionId = sesion!.id;
  }

  const { error } = await supabase.rpc('registrar_gasto', {
    p_categoria_gasto_id: categoriaId,
    p_descripcion: descripcion,
    p_monto_total: montoTotal,
    p_tasa_iva: tasaIva,
    p_proveedor_id: proveedorId,
    p_fecha: fecha,
    p_pagar_efectivo: pagarEfectivo,
    p_sesion_caja_id: sesionId,
  });

  if (error) redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/gastos');
  // El gasto en efectivo descuenta la caja; su IVA suma al crédito del F29.
  if (pagarEfectivo) revalidatePath('/caja');
  revalidatePath('/reportes/iva');
  redirect('/gastos?ok=1');
}
