'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
  await supabase.auth.refreshSession();
  redirect('/');
}
