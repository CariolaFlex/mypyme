'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type LineaInput = {
  producto_id: string;
  cantidad: number;
  costo_neto_unit: number;
  tasa_iva: number;
};

export async function crearOrden(formData: FormData) {
  const supabase = await createClient();

  const proveedorId = String(formData.get('proveedor_id') ?? '');
  const fechaEsperada = String(formData.get('fecha_esperada') ?? '') || null;
  let lineas: LineaInput[] = [];
  try {
    lineas = JSON.parse(String(formData.get('lineas') ?? '[]'));
  } catch {
    redirect('/compras/ordenes/nueva?error=Líneas inválidas');
  }

  if (!proveedorId) redirect('/compras/ordenes/nueva?error=Selecciona un proveedor');
  lineas = lineas.filter((l) => l.producto_id && l.cantidad > 0);
  if (!lineas.length) redirect('/compras/ordenes/nueva?error=Agrega al menos una línea válida');

  const { data: ocId, error } = await supabase.rpc('crear_orden_compra', {
    p_proveedor_id: proveedorId,
    p_lineas: lineas,
    p_fecha_esperada: fechaEsperada,
  });
  if (error) redirect(`/compras/ordenes/nueva?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/compras/ordenes');
  redirect(`/compras/ordenes/${ocId}`);
}

export async function aprobarOrden(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('oc_id') ?? '');
  const { error } = await supabase.rpc('aprobar_orden_compra', { p_oc_id: id });
  if (error) redirect(`/compras/ordenes/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/compras/ordenes/${id}`);
  redirect(`/compras/ordenes/${id}?ok=aprobada`);
}

export async function cancelarOrden(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('oc_id') ?? '');
  const { error } = await supabase.rpc('cancelar_orden_compra', { p_oc_id: id });
  if (error) redirect(`/compras/ordenes/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/compras/ordenes/${id}`);
  redirect(`/compras/ordenes/${id}?ok=cancelada`);
}

export async function recibirOrden(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get('oc_id') ?? '');
  let recepciones: { linea_id: string; cantidad: number }[] = [];
  try {
    recepciones = JSON.parse(String(formData.get('recepciones') ?? '[]'));
  } catch {
    redirect(`/compras/ordenes/${id}?error=Recepción inválida`);
  }
  recepciones = recepciones.filter((r) => r.linea_id && r.cantidad > 0);
  if (!recepciones.length) {
    redirect(`/compras/ordenes/${id}?error=${encodeURIComponent('Ingresa al menos una cantidad a recibir')}`);
  }

  const { error } = await supabase.rpc('recibir_orden_compra', {
    p_oc_id: id,
    p_recepciones: recepciones,
  });
  if (error) redirect(`/compras/ordenes/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/compras/ordenes/${id}`);
  redirect(`/compras/ordenes/${id}?ok=recibida`);
}
