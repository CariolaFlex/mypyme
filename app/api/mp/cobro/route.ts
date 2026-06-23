// Inicia un cobro con Mercado Pago Point desde el POS.
// Crea el payment intent sobre la terminal del comerciante y guarda el payload
// de la venta en mp_cobros (estado pending). El webhook, al confirmarse el pago,
// registra la venta vía registrar_venta_mp. El POS hace poll de mp_cobros.
//
// Gated: requiere MP configurado + conexión + device activo. El cobro Point exige
// internet (el efectivo del POS sigue offline; esto NO).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mpConfigurado } from '@/lib/mp/config';
import { crearPaymentIntent, cancelarPaymentIntent } from '@/lib/mp/client';

export const runtime = 'nodejs';

type Linea = { producto_id: string; cantidad: number };
type Pago = { metodo_pago_id: string; monto: number; monto_recibido?: number };

export async function POST(request: Request) {
  if (!mpConfigurado()) {
    return NextResponse.json({ error: 'Mercado Pago no configurado' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const empresaId = (claimsData?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  if (!empresaId) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  let body: {
    ventaId?: string;
    lineas?: Linea[];
    pagos?: Pago[];
    sesionCajaId?: string | null;
    total?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { ventaId, lineas, pagos, sesionCajaId, total } = body;
  if (!ventaId || !lineas?.length || !pagos?.length || !total || total <= 0) {
    return NextResponse.json({ error: 'Faltan datos de la venta' }, { status: 400 });
  }

  // Device activo del comerciante (Fase 1: uno por empresa).
  const { data: device } = await supabase
    .from('mp_dispositivos')
    .select('device_id')
    .eq('estado', 'activo')
    .order('creado_en', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!device) {
    return NextResponse.json({ error: 'No hay terminal Point vinculada' }, { status: 400 });
  }

  const admin = createAdminClient();
  try {
    const intent = await crearPaymentIntent(empresaId, device.device_id, total, ventaId);

    const { data: cobro, error } = await admin
      .from('mp_cobros')
      .insert({
        empresa_id: empresaId,
        venta_id: ventaId,
        payment_intent_id: intent.id,
        device_id: device.device_id,
        monto: total,
        estado: 'pending',
        payload: { lineas, pagos, sesion_caja_id: sesionCajaId ?? null },
        raw: intent.raw,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, cobroId: cobro.id, intentId: intent.id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

// Cancela el cobro Point en curso (el cajero abortó). Best-effort.
export async function DELETE(request: Request) {
  if (!mpConfigurado()) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const empresaId = (claimsData?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  if (!empresaId) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  let ventaId: string | undefined;
  try {
    ventaId = (await request.json())?.ventaId;
  } catch {
    /* sin body */
  }
  if (!ventaId) return NextResponse.json({ error: 'Falta ventaId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: cobro } = await admin
    .from('mp_cobros')
    .select('id, device_id, payment_intent_id, estado')
    .eq('empresa_id', empresaId)
    .eq('venta_id', ventaId)
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cobro && cobro.estado === 'pending') {
    try {
      if (cobro.payment_intent_id) {
        await cancelarPaymentIntent(empresaId, cobro.device_id, cobro.payment_intent_id);
      }
    } catch {
      /* el intent pudo expirar o ya estar resuelto: igual marcamos cancelado */
    }
    await admin
      .from('mp_cobros')
      .update({ estado: 'canceled', actualizado_en: new Date().toISOString() })
      .eq('id', cobro.id);
  }

  return NextResponse.json({ ok: true });
}
