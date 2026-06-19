'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function crearFactura(formData: FormData) {
  const supabase = await createClient();

  const proveedorId = String(formData.get('proveedor_id') ?? '');
  const numero = String(formData.get('numero_factura') ?? '').trim();
  const montoTotal = Number(formData.get('monto_total') ?? 0);
  const tipoDoc = String(formData.get('tipo_documento') ?? 'factura');
  const exento = tipoDoc === 'factura_exenta' || tipoDoc === 'boleta_exenta' || tipoDoc === 'sin_documento';
  const tasaIva = exento ? 0 : Number(formData.get('tasa_iva') ?? 0);
  const ocId = String(formData.get('orden_compra_id') ?? '') || null;
  const fecha = String(formData.get('fecha') ?? '') || null;
  const vencimiento = String(formData.get('vencimiento') ?? '') || null;

  if (!proveedorId || !numero || montoTotal <= 0) {
    redirect('/compras/facturas/nueva?error=' + encodeURIComponent('Completa proveedor, número y monto'));
  }

  const { data: facId, error } = await supabase.rpc('crear_factura_proveedor', {
    p_proveedor_id: proveedorId,
    p_numero_factura: numero,
    p_monto_total: montoTotal,
    p_tasa_iva: tasaIva,
    p_orden_compra_id: ocId,
    p_fecha: fecha,
    p_vencimiento: vencimiento,
  });
  if (error) {
    const msg = error.code === '23505' ? 'Ya existe esa factura para el proveedor' : error.message;
    redirect(`/compras/facturas/nueva?error=${encodeURIComponent(msg)}`);
  }

  // El RPC no recibe el tipo de documento (firma estable); se setea aparte.
  if (facId && tipoDoc !== 'factura') {
    await supabase.from('facturas_proveedor').update({ tipo_documento: tipoDoc }).eq('id', facId);
  }

  revalidatePath('/compras/facturas');
  redirect(`/compras/facturas/${facId}`);
}

export async function registrarPagoProveedor(formData: FormData) {
  const supabase = await createClient();
  const facturaId = String(formData.get('factura_id') ?? '');
  const monto = Number(formData.get('monto') ?? 0);
  const metodoId = String(formData.get('metodo_pago_id') ?? '') || null;
  const pagarEfectivo = String(formData.get('pagar_efectivo') ?? '') === 'on';

  if (!facturaId || monto <= 0) {
    redirect(`/compras/facturas/${facturaId}?error=${encodeURIComponent('Monto inválido')}`);
  }

  let sesionId: string | null = null;
  if (pagarEfectivo) {
    const { data: sesion } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('estado', 'abierta')
      .maybeSingle();
    if (!sesion) {
      redirect(`/compras/facturas/${facturaId}?error=${encodeURIComponent('No hay caja abierta para pagar en efectivo')}`);
    }
    sesionId = sesion!.id;
  }

  const { error } = await supabase.rpc('registrar_pago_proveedor', {
    p_factura_id: facturaId,
    p_monto: monto,
    p_metodo_pago_id: metodoId,
    p_pagar_efectivo: pagarEfectivo,
    p_sesion_caja_id: sesionId,
  });
  if (error) redirect(`/compras/facturas/${facturaId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/compras/facturas/${facturaId}`);
  // Cambia el total "por pagar" del listado; si fue en efectivo, toca la caja.
  revalidatePath('/compras/facturas');
  if (pagarEfectivo) revalidatePath('/caja');
  redirect(`/compras/facturas/${facturaId}?ok=pago`);
}
