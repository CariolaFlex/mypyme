// OAuth de Mercado Pago (marketplace): intercambio del code por tokens del
// comerciante y refresco. Doc: developers > OAuth.
// El access_token cae sobre la cuenta del comerciante → el dinero de cada venta
// va a SU cuenta MP (Gestionala no custodia plata).
import { MP_API, mpCredenciales, mpRedirectUri } from './config';

export type MpTokens = {
  accessToken: string;
  refreshToken: string | null;
  userId: string | null;
  scope: string | null;
  expiresIn: number | null; // segundos
};

function parse(data: Record<string, unknown>): MpTokens {
  return {
    accessToken: String(data.access_token ?? ''),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    userId: data.user_id != null ? String(data.user_id) : null,
    scope: data.scope ? String(data.scope) : null,
    expiresIn: data.expires_in != null ? Number(data.expires_in) : null,
  };
}

async function tokenRequest(body: Record<string, string>): Promise<MpTokens> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || !data.access_token) {
    throw new Error((data?.message as string) || `MP oauth/token HTTP ${res.status}`);
  }
  return parse(data);
}

/** Intercambia el `code` del callback por los tokens del comerciante. */
export async function intercambiarCode(code: string, origin?: string): Promise<MpTokens> {
  const { clientId, clientSecret } = mpCredenciales();
  return tokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: mpRedirectUri(origin),
  });
}

/** Refresca el access_token con el refresh_token. */
export async function refrescarToken(refreshToken: string): Promise<MpTokens> {
  const { clientId, clientSecret } = mpCredenciales();
  return tokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}
