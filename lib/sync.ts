import { createClient } from '@/lib/supabase/client';
import { db, type VentaPayload } from '@/lib/db';

/**
 * Envía una venta al backend vía RPC idempotente.
 * Lanza si hay error de red (para que el llamador la encole).
 */
export async function enviarVenta(payload: VentaPayload): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('process_sale', {
    p_venta_id: payload.ventaId,
    p_lineas: payload.lineas,
    p_pagos: payload.pagos,
    p_sesion_caja_id: payload.sesionCajaId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Reenvía todas las ventas en cola. Idempotente: si una ya se había
 * persistido, process_sale la devuelve sin duplicar. Se detiene en el
 * primer fallo de red para reintentar más tarde.
 * Devuelve cuántas se sincronizaron.
 */
export async function flushQueue(): Promise<number> {
  const pendientes = await db.ventasPendientes.orderBy('creadoEn').toArray();
  let enviadas = 0;
  for (const v of pendientes) {
    try {
      await enviarVenta(v.payload);
      await db.ventasPendientes.delete(v.ventaId);
      enviadas++;
    } catch {
      break; // probablemente sin red; se reintenta luego
    }
  }
  return enviadas;
}

export async function contarPendientes(): Promise<number> {
  return db.ventasPendientes.count();
}
