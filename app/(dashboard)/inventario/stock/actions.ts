'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Mapea la operación elegida a (tipo de movimiento, signo de la cantidad).
const OPERACIONES: Record<string, { tipo: string; signo: number }> = {
  entrada: { tipo: 'compra', signo: 1 },
  merma: { tipo: 'merma', signo: -1 },
  ajuste_pos: { tipo: 'ajuste', signo: 1 },
  ajuste_neg: { tipo: 'ajuste', signo: -1 },
};

export async function registrarMovimiento(formData: FormData) {
  const supabase = await createClient();

  const productoId = String(formData.get('producto_id') ?? '');
  const bodegaId = String(formData.get('bodega_id') ?? '');
  const op = OPERACIONES[String(formData.get('operacion') ?? '')];
  const cantidad = Math.abs(Number(formData.get('cantidad') ?? 0));
  const nota = String(formData.get('nota') ?? '').trim() || null;

  if (!productoId || !bodegaId || !op || !cantidad) {
    redirect('/inventario/stock?error=Completa producto, operación y cantidad');
  }

  const { error } = await supabase.rpc('registrar_movimiento', {
    p_producto_id: productoId,
    p_bodega_id: bodegaId,
    p_cantidad: cantidad * op.signo,
    p_tipo: op.tipo,
    p_nota: nota,
  });

  if (error) {
    redirect(`/inventario/stock?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/inventario/stock');
  redirect('/inventario/stock?ok=1');
}
