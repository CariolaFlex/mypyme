'use server';

import { createClient } from '@/lib/supabase/server';

export type CobrarInput = {
  ventaId: string;
  lineas: { producto_id: string; cantidad: number }[];
  pagos: { metodo_pago_id: string; monto: number }[];
};

export async function cobrar(input: CobrarInput): Promise<{ ok: boolean; error?: string }> {
  if (!input.lineas.length) return { ok: false, error: 'El carrito está vacío' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('process_sale', {
    p_venta_id: input.ventaId,
    p_lineas: input.lineas,
    p_pagos: input.pagos,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
