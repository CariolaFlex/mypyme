'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCtx() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  return {
    supabase,
    empresaId: claims?.empresa_id as string | undefined,
    rol: claims?.user_rol as string | undefined,
  };
}

const back = (qs: string) => redirect(`/configuracion/usuarios?${qs}`);

/**
 * Crea (o vincula) un usuario y lo agrega como miembro de la empresa.
 * Sin SMTP: el admin define email + clave temporal y se la entrega en persona.
 * Usa el service_role (admin API) → guarda estricta: solo un admin del tenant.
 */
export async function crearEmpleado(formData: FormData) {
  const { empresaId, rol } = await getCtx();
  if (!empresaId) redirect('/onboarding');
  if (rol !== 'admin') back('error=' + encodeURIComponent('Solo un administrador puede crear usuarios'));

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const nuevoRol = String(formData.get('rol') ?? 'empleado') === 'admin' ? 'admin' : 'empleado';

  if (!email || !email.includes('@')) back('error=' + encodeURIComponent('Email inválido'));
  if (password.length < 8) back('error=' + encodeURIComponent('La clave debe tener al menos 8 caracteres'));

  const admin = createAdminClient();

  // 1. Crear el usuario auth (confirmado, sin email). Si ya existe, lo buscamos.
  let userId: string | undefined;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr) {
    // Email ya registrado → buscar el user existente y vincularlo a esta empresa.
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) {
      back('error=' + encodeURIComponent(createErr.message));
    }
    userId = existing!.id;
  } else {
    userId = created.user.id;
  }

  // 2. ¿Ya es miembro de esta empresa?
  const { data: yaMiembro } = await admin
    .from('usuarios_empresa')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('usuario_id', userId!)
    .maybeSingle();
  if (yaMiembro) back('error=' + encodeURIComponent('Ese usuario ya pertenece a la empresa'));

  // 3. Crear la membresía.
  const { error: memErr } = await admin.from('usuarios_empresa').insert({
    empresa_id: empresaId,
    usuario_id: userId!,
    rol: nuevoRol,
  });
  if (memErr) back('error=' + encodeURIComponent(memErr.message));

  revalidatePath('/configuracion/usuarios');
  back('ok=' + encodeURIComponent(`Usuario ${email} agregado`));
}

export async function cambiarRol(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const target = String(formData.get('usuario_id') ?? '');
  const nuevoRol = String(formData.get('rol') ?? '') === 'admin' ? 'admin' : 'empleado';

  const { error } = await supabase.rpc('cambiar_rol_usuario_empresa', {
    p_target: target,
    p_rol: nuevoRol,
  });
  if (error) back('error=' + encodeURIComponent(error.message));

  revalidatePath('/configuracion/usuarios');
  back('ok=' + encodeURIComponent('Rol actualizado'));
}

export async function quitarUsuario(formData: FormData) {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) redirect('/onboarding');

  const target = String(formData.get('usuario_id') ?? '');
  const { error } = await supabase.rpc('quitar_usuario_empresa', { p_target: target });
  if (error) back('error=' + encodeURIComponent(error.message));

  revalidatePath('/configuracion/usuarios');
  back('ok=' + encodeURIComponent('Usuario quitado'));
}
