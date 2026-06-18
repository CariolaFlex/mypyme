'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function mensajeError(code: string | undefined, raw: string): string {
  switch (code) {
    case '23514':
      return 'El RUT no es válido (dígito verificador incorrecto).';
    case '23505':
      return 'Ese RUT ya está registrado.';
    case 'P0001':
      return 'Tu usuario ya tiene una empresa asociada.';
    case '28000':
      return 'Sesión expirada, vuelve a iniciar sesión.';
    default:
      return raw || 'No se pudo crear la empresa.';
  }
}

/**
 * El usuario creó cuenta pero decide no continuar → eliminar el usuario de
 * Supabase Auth (con service_role), cerrar sesión y volver a la landing.
 */
export async function cancelarRegistro() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  }

  await supabase.auth.signOut();
  redirect('/');
}

export async function crearEmpresa(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.rpc('crear_empresa_y_membresia', {
    p_rut: String(formData.get('rut') ?? '').trim(),
    p_razon_social: String(formData.get('razon_social') ?? '').trim(),
    p_giro: String(formData.get('giro') ?? '').trim() || null,
    p_telefono: String(formData.get('telefono') ?? '').trim() || null,
    p_direccion: String(formData.get('direccion') ?? '').trim() || null,
    p_usa_iva: formData.get('usa_iva') === 'on',
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(mensajeError(error.code, error.message))}`);
  }

  // El empresa_id se inyecta en el JWT vía el Auth Hook al emitir un token nuevo.
  // refreshSession fuerza esa reemisión para que el RLS ya filtre por empresa.
  // Si el refresh falla acá (carrera de rotación del refresh-token), no importa:
  // el middleware autocura el claim en la primera request a /inicio.
  await supabase.auth.refreshSession();
  redirect('/inicio');
}
