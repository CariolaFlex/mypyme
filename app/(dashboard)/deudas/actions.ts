'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { clp } from '@/lib/reportes';

const TIPOS = ['por_cobrar', 'por_pagar'] as const;
const CATEGORIAS = ['cliente', 'empleado', 'personal', 'proveedor', 'servicio', 'otro'] as const;

async function getCtx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  return {
    supabase,
    empresaId: claims?.empresa_id as string | undefined,
    usuarioId: claims?.sub as string | undefined,
  };
}

export async function crearDeuda(formData: FormData) {
  const { supabase, empresaId, usuarioId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const tipo = String(formData.get('tipo') ?? '');
  const categoria = String(formData.get('categoria') ?? 'otro');
  const contraparte = String(formData.get('contraparte') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  const monto = Number(formData.get('monto') ?? 0);
  const fecha = String(formData.get('fecha') ?? '') || null;
  const vencimiento = String(formData.get('fecha_vencimiento') ?? '') || null;
  const proveedorId = String(formData.get('proveedor_id') ?? '') || null;

  if (!TIPOS.includes(tipo as (typeof TIPOS)[number]) || !contraparte || !(monto > 0)) {
    redirect('/deudas?error=' + encodeURIComponent('Completa tipo, nombre y un monto mayor a 0'));
  }

  const { error } = await supabase.from('deudas').insert({
    empresa_id: empresaId,
    tipo,
    categoria: CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number]) ? categoria : 'otro',
    contraparte,
    proveedor_id: proveedorId,
    descripcion: descripcion || null,
    monto_total: monto,
    saldo: monto, // nace impaga completa; los abonos la van bajando
    ...(fecha ? { fecha } : {}),
    fecha_vencimiento: vencimiento,
    usuario_id: usuarioId ?? null,
  });
  if (error) redirect(`/deudas?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/deudas');
  redirect('/deudas?ok=1');
}

export async function editarDeuda(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  const tipo = String(formData.get('tipo') ?? '');
  const categoria = String(formData.get('categoria') ?? 'otro');
  const contraparte = String(formData.get('contraparte') ?? '').trim();
  const descripcion = String(formData.get('descripcion') ?? '').trim();
  const monto = Number(formData.get('monto') ?? 0);
  const fecha = String(formData.get('fecha') ?? '') || null;
  const vencimiento = String(formData.get('fecha_vencimiento') ?? '') || null;
  const proveedorId = String(formData.get('proveedor_id') ?? '') || null;

  if (!id || !TIPOS.includes(tipo as (typeof TIPOS)[number]) || !contraparte || !(monto > 0)) {
    redirect('/deudas?error=' + encodeURIComponent('Completa tipo, nombre y un monto mayor a 0'));
  }

  // Reconciliar con lo ya abonado: el monto total no puede bajar de lo pagado.
  // abonado = monto_total - saldo (invariante del RPC de abonos).
  const { data: actual } = await supabase
    .from('deudas')
    .select('monto_total, saldo')
    .eq('id', id)
    .maybeSingle();
  if (!actual) redirect('/deudas?error=' + encodeURIComponent('Deuda no encontrada'));

  const abonado = Number(actual!.monto_total) - Number(actual!.saldo);
  if (monto < abonado) {
    redirect(
      '/deudas?error=' +
        encodeURIComponent(`El monto no puede ser menor a lo ya abonado (${clp.format(abonado)})`)
    );
  }
  const nuevoSaldo = Math.round((monto - abonado) * 100) / 100;

  const { error } = await supabase
    .from('deudas')
    .update({
      tipo,
      categoria: CATEGORIAS.includes(categoria as (typeof CATEGORIAS)[number]) ? categoria : 'otro',
      contraparte,
      proveedor_id: proveedorId,
      descripcion: descripcion || null,
      monto_total: monto,
      saldo: nuevoSaldo,
      estado: nuevoSaldo === 0 ? 'pagada' : 'pendiente',
      ...(fecha ? { fecha } : {}),
      fecha_vencimiento: vencimiento,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) redirect(`/deudas?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/deudas');
  redirect('/deudas?ok=1');
}

export async function abonarDeuda(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const deudaId = String(formData.get('deuda_id') ?? '');
  const monto = Number(formData.get('monto') ?? 0);
  const nota = String(formData.get('nota') ?? '').trim() || null;
  if (!deudaId || !(monto > 0)) {
    redirect('/deudas?error=' + encodeURIComponent('El abono debe ser mayor a 0'));
  }

  // El RPC es atómico: valida el saldo con lock y marca 'pagada' al llegar a 0.
  const { error } = await supabase.rpc('abonar_deuda', {
    p_deuda_id: deudaId,
    p_monto: monto,
    p_nota: nota,
  });
  if (error) redirect(`/deudas?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/deudas');
  redirect('/deudas?ok=1');
}

export async function eliminarDeuda(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const id = String(formData.get('id') ?? '');
  // Los abonos caen por cascada (historial de una deuda borrada no sirve solo).
  const { error } = await supabase.from('deudas').delete().eq('id', id);
  if (error) redirect(`/deudas?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/deudas');
  redirect('/deudas?ok=1');
}
