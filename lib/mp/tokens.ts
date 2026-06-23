// Resuelve un access_token válido del comerciante para llamar a la API de MP.
// Lee mp_conexiones (admin client, bypasea RLS y las columnas de token están
// revocadas para authenticated), descifra, y refresca server-side si está por
// vencer, re-cifrando y persistiendo. SOLO server-side.
import { createAdminClient } from '@/lib/supabase/admin';
import { cifrar, descifrar } from './crypto';
import { refrescarToken } from './oauth';

const MARGEN_MS = 5 * 60_000; // refrescar si vence en < 5 min

export async function getAccessTokenValido(empresaId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: conx, error } = await admin
    .from('mp_conexiones')
    .select('access_token_cifrado, refresh_token_cifrado, expira_en, estado')
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!conx || conx.estado !== 'conectada') {
    throw new Error('La empresa no tiene Mercado Pago conectado');
  }

  const venceEn = conx.expira_en ? new Date(conx.expira_en).getTime() : 0;
  const porVencer = !venceEn || venceEn - Date.now() < MARGEN_MS;

  if (!porVencer) return descifrar(conx.access_token_cifrado);

  // Refrescar.
  if (!conx.refresh_token_cifrado) {
    // Sin refresh: devolvemos el actual (puede fallar la llamada → reconectar).
    return descifrar(conx.access_token_cifrado);
  }
  const nuevos = await refrescarToken(descifrar(conx.refresh_token_cifrado));
  const expira = nuevos.expiresIn ? new Date(Date.now() + nuevos.expiresIn * 1000).toISOString() : null;

  await admin
    .from('mp_conexiones')
    .update({
      access_token_cifrado: cifrar(nuevos.accessToken),
      refresh_token_cifrado: nuevos.refreshToken ? cifrar(nuevos.refreshToken) : conx.refresh_token_cifrado,
      expira_en: expira,
      actualizado_en: new Date().toISOString(),
    })
    .eq('empresa_id', empresaId);

  return nuevos.accessToken;
}
