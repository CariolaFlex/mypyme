'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function guardarNegocio(formData: FormData) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const empresaId = (claims?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;

  if (!empresaId) {
    redirect('/onboarding');
  }

  const ahora = new Date().toISOString();

  const { error: errEmpresa } = await supabase
    .from('empresas')
    .update({
      razon_social: String(formData.get('razon_social') ?? '').trim(),
      giro: String(formData.get('giro') ?? '').trim() || null,
      telefono: String(formData.get('telefono') ?? '').trim() || null,
      direccion: String(formData.get('direccion') ?? '').trim() || null,
      actualizado_en: ahora,
    })
    .eq('id', empresaId);

  if (errEmpresa) {
    redirect(`/configuracion/negocio?error=${encodeURIComponent(errEmpresa.message)}`);
  }

  const { error: errConfig } = await supabase
    .from('configuracion_negocio')
    .update({
      usa_iva: formData.get('usa_iva') === 'on',
      precios_con_iva: formData.get('precios_con_iva') === 'on',
      tasa_iva_default: Number(formData.get('tasa_iva_default') ?? 19),
      umbral_stock_bajo: Number(formData.get('umbral_stock_bajo') ?? 5),
      actualizado_en: ahora,
    })
    .eq('empresa_id', empresaId);

  if (errConfig) {
    redirect(`/configuracion/negocio?error=${encodeURIComponent(errConfig.message)}`);
  }

  revalidatePath('/configuracion/negocio');
  redirect('/configuracion/negocio?ok=1');
}
