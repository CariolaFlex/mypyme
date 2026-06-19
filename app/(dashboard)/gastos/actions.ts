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

async function getCtx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  return { supabase, empresaId };
}

export async function editarGasto(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const categoriaId = String(formData.get('categoria_gasto_id') ?? '');
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  if (!categoriaId || !descripcion) redirect('/gastos?error=Completa categoría y descripción');

  // Si el gasto descontó caja, no se permite cambiar el monto (descuadraría la
  // caja, posiblemente ya cerrada). Sí se pueden corregir los campos descriptivos.
  const { data: g } = await supabase.from('gastos').select('sesion_caja_id').eq('id', id).maybeSingle();
  const cajaLinked = !!g?.sesion_caja_id;

  const updates: Record<string, unknown> = {
    categoria_gasto_id: categoriaId,
    proveedor_id: String(formData.get('proveedor_id') ?? '') || null,
    descripcion,
  };
  const fecha = String(formData.get('fecha') ?? '');
  if (fecha) updates.fecha = fecha;

  if (!cajaLinked) {
    const montoTotal = Number(formData.get('monto_total') ?? 0);
    const tasaIva = Number(formData.get('tasa_iva') ?? 0);
    if (montoTotal <= 0) redirect('/gastos?error=El monto debe ser mayor a 0');
    const neto = tasaIva > 0 ? Math.round((montoTotal / (1 + tasaIva / 100)) * 100) / 100 : montoTotal;
    updates.monto_total = montoTotal;
    updates.monto_neto = neto;
    updates.monto_iva = Math.round((montoTotal - neto) * 100) / 100;
  }

  const { error } = await supabase.from('gastos').update(updates).eq('id', id);
  if (error) redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/gastos');
  revalidatePath('/reportes/iva');
  redirect('/gastos?ok=1');
}

export async function eliminarGasto(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');

  // Un gasto pagado de la caja tiene un movimiento de caja asociado (FK RESTRICT)
  // y eliminarlo descuadraría la caja. En ese caso no se permite borrar.
  const { data: g } = await supabase.from('gastos').select('sesion_caja_id').eq('id', id).maybeSingle();
  if (g?.sesion_caja_id) {
    redirect(
      `/gastos?error=${encodeURIComponent(
        'Este gasto se pagó en efectivo y afecta la caja; no se puede eliminar para no descuadrarla.'
      )}`
    );
  }

  const { error } = await supabase.from('gastos').delete().eq('id', id);
  if (error) redirect(`/gastos?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/gastos');
  revalidatePath('/reportes/iva');
  redirect('/gastos?ok=1');
}
