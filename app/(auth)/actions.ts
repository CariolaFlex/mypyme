'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/');
}

export async function register(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  // Con "Confirm email" desactivado, signUp devuelve sesión → directo a onboarding.
  // Con confirmación activada, no hay sesión hasta confirmar el correo.
  if (data.session) {
    redirect('/onboarding');
  }
  redirect('/login?message=' + encodeURIComponent('Revisa tu correo para confirmar la cuenta.'));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Solicita el correo de recuperación de contraseña. El envío real requiere
 * SMTP configurado en Supabase (Sprint 5); sin él, Supabase no entrega el mail.
 * Mostramos un mensaje genérico para no revelar si el correo existe.
 */
export async function solicitarReset(formData: FormData) {
  const email = String(formData.get('email') ?? '');

  if (email) {
    const hdrs = await headers();
    const origin = hdrs.get('origin') ?? `https://${hdrs.get('host')}`;
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/actualizar-clave`,
    });
  }

  redirect('/recuperar?sent=1');
}

/**
 * Fija la nueva contraseña. Requiere una sesión de recuperación activa (creada
 * por /auth/callback al intercambiar el code del enlace del correo).
 */
export async function actualizarClave(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 6) {
    redirect('/actualizar-clave?error=' + encodeURIComponent('La contraseña debe tener al menos 6 caracteres.'));
  }
  if (password !== confirm) {
    redirect('/actualizar-clave?error=' + encodeURIComponent('Las contraseñas no coinciden.'));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect('/actualizar-clave?error=' + encodeURIComponent(error.message));
  }
  // Cerramos la sesión de recuperación para forzar un login limpio con la nueva clave.
  await supabase.auth.signOut();
  redirect('/login?message=' + encodeURIComponent('Contraseña actualizada. Inicia sesión con tu nueva clave.'));
}
