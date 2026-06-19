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

export async function crearProveedor(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/compras/proveedores?error=Nombre requerido');

  const { error } = await supabase.from('proveedores').insert({
    empresa_id: empresaId,
    nombre,
    rut: String(formData.get('rut') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim() || null,
    telefono: String(formData.get('telefono') ?? '').trim() || null,
  });

  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un proveedor con ese nombre' : error.message;
    redirect(`/compras/proveedores?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/compras/proveedores');
  redirect('/compras/proveedores?ok=1');
}

export async function editarProveedor(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!nombre) redirect('/compras/proveedores?error=Nombre requerido');

  const { error } = await supabase
    .from('proveedores')
    .update({
      nombre,
      rut: String(formData.get('rut') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      telefono: String(formData.get('telefono') ?? '').trim() || null,
    })
    .eq('id', id);

  if (error) {
    const msg = error.code === '23505' ? 'Ya existe un proveedor con ese nombre' : error.message;
    redirect(`/compras/proveedores?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath('/compras/proveedores');
  redirect('/compras/proveedores?ok=1');
}

export async function eliminarProveedor(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');

  // No se puede borrar un proveedor referenciado por gastos, órdenes o facturas
  // (FK RESTRICT). En ese caso se archiva (desactiva).
  const [{ count: gastos }, { count: ordenes }, { count: facturas }] = await Promise.all([
    supabase.from('gastos').select('id', { count: 'exact', head: true }).eq('proveedor_id', id),
    supabase.from('ordenes_compra').select('id', { count: 'exact', head: true }).eq('proveedor_id', id),
    supabase.from('facturas_proveedor').select('id', { count: 'exact', head: true }).eq('proveedor_id', id),
  ]);

  if ((gastos ?? 0) > 0 || (ordenes ?? 0) > 0 || (facturas ?? 0) > 0) {
    redirect(
      `/compras/proveedores?error=${encodeURIComponent(
        'No se puede eliminar: el proveedor tiene gastos, órdenes o facturas asociadas. Desactívalo para ocultarlo sin perder el historial.'
      )}`
    );
  }

  const { error } = await supabase.from('proveedores').delete().eq('id', id);
  if (error) redirect(`/compras/proveedores?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/compras/proveedores');
  redirect('/compras/proveedores?ok=1');
}

export async function toggleProveedor(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const activo = String(formData.get('activo') ?? '') === 'true';
  const { error } = await supabase.from('proveedores').update({ activo: !activo }).eq('id', id);
  if (error) redirect(`/compras/proveedores?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/compras/proveedores');
  redirect('/compras/proveedores?ok=1');
}
