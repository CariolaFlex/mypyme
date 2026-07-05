'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { NOMBRES_COLOR, NOMBRES_ICONO, normalizarDestino } from '@/lib/accesos';

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

const MAX_ACCESOS = 12; // techo sensato para que la grilla no se vuelva un muro

/** Crea un acceso rápido para el usuario actual (al final del orden). */
export async function crearAcceso(input: {
  etiqueta: string;
  icono: string;
  destino: string;
  color: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, empresaId, usuarioId } = await getCtx();
  if (!empresaId || !usuarioId) return { error: 'Sesión expirada' };

  const etiqueta = input.etiqueta.trim().slice(0, 40);
  const destino = normalizarDestino(input.destino);
  if (!etiqueta) return { error: 'Ponle un nombre al acceso' };
  if (!destino) return { error: 'El destino debe ser una sección o una URL válida (https://…)' };
  const icono = NOMBRES_ICONO.includes(input.icono) ? input.icono : 'Zap';
  const color = NOMBRES_COLOR.includes(input.color) ? input.color : 'blue';

  const { count } = await supabase
    .from('accesos_rapidos')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId);
  if ((count ?? 0) >= MAX_ACCESOS) return { error: `Máximo ${MAX_ACCESOS} accesos rápidos` };

  const { error } = await supabase.from('accesos_rapidos').insert({
    empresa_id: empresaId,
    usuario_id: usuarioId,
    etiqueta,
    icono,
    destino,
    color,
    orden: count ?? 0,
  });
  if (error) return { error: error.message };
  revalidatePath('/inicio');
  return { ok: true };
}

/** Edita un acceso existente (solo del propio usuario; el RLS lo garantiza). */
export async function editarAcceso(input: {
  id: string;
  etiqueta: string;
  icono: string;
  destino: string;
  color: string;
}): Promise<{ ok: true } | { error: string }> {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) return { error: 'Sesión expirada' };

  const etiqueta = input.etiqueta.trim().slice(0, 40);
  const destino = normalizarDestino(input.destino);
  if (!etiqueta) return { error: 'Ponle un nombre al acceso' };
  if (!destino) return { error: 'El destino debe ser una sección o una URL válida (https://…)' };

  const { error } = await supabase
    .from('accesos_rapidos')
    .update({
      etiqueta,
      destino,
      icono: NOMBRES_ICONO.includes(input.icono) ? input.icono : 'Zap',
      color: NOMBRES_COLOR.includes(input.color) ? input.color : 'blue',
    })
    .eq('id', input.id);
  if (error) return { error: error.message };
  revalidatePath('/inicio');
  return { ok: true };
}

export async function eliminarAcceso(id: string): Promise<{ ok: true } | { error: string }> {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) return { error: 'Sesión expirada' };
  const { error } = await supabase.from('accesos_rapidos').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/inicio');
  return { ok: true };
}

/** Persiste un nuevo orden (lista de ids en el orden deseado). Se llama tras
 *  mover un acceso; escribe el índice de cada uno. */
export async function reordenarAccesos(ids: string[]): Promise<{ ok: true } | { error: string }> {
  const { supabase, empresaId } = await getCtx();
  if (!empresaId) return { error: 'Sesión expirada' };
  // Updates individuales (son ≤12): cada acceso recibe su posición nueva.
  await Promise.all(
    ids.map((id, i) => supabase.from('accesos_rapidos').update({ orden: i }).eq('id', id))
  );
  revalidatePath('/inicio');
  return { ok: true };
}
