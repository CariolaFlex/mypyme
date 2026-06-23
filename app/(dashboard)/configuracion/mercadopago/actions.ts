'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mpConfigurado, mpCredenciales, mpRedirectUri } from '@/lib/mp/config';

const RUTA = '/configuracion/mercadopago';

async function getEmpresaId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const empresaId = (data?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  return { supabase, empresaId };
}

/** Arranca el OAuth: setea state (CSRF) y redirige a la autorización de MP. */
export async function conectarMP() {
  if (!mpConfigurado()) redirect(`${RUTA}?error=${encodeURIComponent('Mercado Pago no configurado')}`);
  const { empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const { clientId } = mpCredenciales();
  const state = randomBytes(16).toString('hex');
  const jar = await cookies();
  jar.set('mp_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' });

  const u = new URL('https://auth.mercadopago.com/authorization');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('platform_id', 'mp');
  u.searchParams.set('state', state);
  u.searchParams.set('redirect_uri', mpRedirectUri());
  redirect(u.toString());
}

/** Vincula una terminal Point y siembra el método de pago del POS. */
export async function vincularDevice(formData: FormData) {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const deviceId = String(formData.get('device_id') ?? '').trim();
  const modo = String(formData.get('modo') ?? '') || null;
  if (!deviceId) redirect(`${RUTA}?error=${encodeURIComponent('Elige una terminal')}`);

  // Fase 1: una terminal activa por empresa. Desactivamos las anteriores.
  await supabase.from('mp_dispositivos').update({ estado: 'inactivo' }).eq('estado', 'activo');

  const { error } = await supabase.from('mp_dispositivos').insert({
    empresa_id: empresaId,
    device_id: deviceId,
    nombre: deviceId,
    modo,
    estado: 'activo',
  });
  if (error && error.code !== '23505') {
    redirect(`${RUTA}?error=${encodeURIComponent(error.message)}`);
  }
  // Si ya existía (23505), reactivarla.
  if (error?.code === '23505') {
    await supabase.from('mp_dispositivos').update({ estado: 'activo' }).eq('device_id', deviceId);
  }

  // Sembrar el método de pago "Mercado Pago Point" (tipo ≠ cash → no toca caja).
  const { data: existe } = await supabase
    .from('metodos_pago')
    .select('id')
    .eq('tipo', 'mercadopago_point')
    .maybeSingle();
  if (!existe) {
    await supabase.from('metodos_pago').insert({
      empresa_id: empresaId,
      nombre: 'Mercado Pago Point',
      tipo: 'mercadopago_point',
    });
  }

  revalidatePath(RUTA);
  revalidatePath('/pos');
  redirect(`${RUTA}?ok=${encodeURIComponent('Terminal vinculada')}`);
}

/** Desconecta MP: revoca la conexión, desactiva terminales y el método. */
export async function desconectarMP() {
  const { supabase, empresaId } = await getEmpresaId();
  if (!empresaId) redirect('/onboarding');

  const admin = createAdminClient();
  await admin.from('mp_conexiones').update({ estado: 'revocada' }).eq('empresa_id', empresaId);
  await supabase.from('mp_dispositivos').update({ estado: 'inactivo' }).eq('estado', 'activo');
  await supabase.from('metodos_pago').update({ activo: false }).eq('tipo', 'mercadopago_point');

  revalidatePath(RUTA);
  revalidatePath('/pos');
  redirect(`${RUTA}?ok=${encodeURIComponent('Mercado Pago desconectado')}`);
}
