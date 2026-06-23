// Callback OAuth de Mercado Pago: recibe el `code`, lo intercambia por los
// tokens del comerciante y los guarda CIFRADOS (admin client). El usuario vuelve
// logueado a nuestra app → la empresa sale de sus claims (igual que el /retorno
// de Flow). `state` se valida contra una cookie (CSRF).
// Gated: sin credenciales MP, vuelve con error.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mpConfigurado } from '@/lib/mp/config';
import { intercambiarCode } from '@/lib/mp/oauth';
import { cifrar } from '@/lib/mp/crypto';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const volver = (qs: string) => NextResponse.redirect(`${base}/configuracion/mercadopago?${qs}`);

  if (!mpConfigurado()) return volver('error=' + encodeURIComponent('Mercado Pago no configurado'));

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const jar = await cookies();
  const stateCookie = jar.get('mp_oauth_state')?.value;
  jar.delete('mp_oauth_state');
  if (!code) return volver('error=' + encodeURIComponent('Mercado Pago no devolvió el code'));
  if (!state || !stateCookie || state !== stateCookie) {
    return volver('error=' + encodeURIComponent('Estado OAuth inválido, reintenta la conexión'));
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const empresaId = (claimsData?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;
  if (!empresaId) return NextResponse.redirect(`${base}/login`);

  try {
    const tokens = await intercambiarCode(code, base);
    const expira = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;

    const admin = createAdminClient();
    const { error } = await admin.from('mp_conexiones').upsert(
      {
        empresa_id: empresaId,
        mp_user_id: tokens.userId,
        access_token_cifrado: cifrar(tokens.accessToken),
        refresh_token_cifrado: tokens.refreshToken ? cifrar(tokens.refreshToken) : null,
        expira_en: expira,
        scope: tokens.scope,
        estado: 'conectada',
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: 'empresa_id' }
    );
    if (error) throw new Error(error.message);

    return volver('ok=' + encodeURIComponent('Mercado Pago conectado. Ahora vincula tu terminal.'));
  } catch (e) {
    return volver('error=' + encodeURIComponent((e as Error).message));
  }
}
