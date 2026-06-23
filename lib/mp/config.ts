// Configuración de Mercado Pago Point. Igual que Flow: si no hay credenciales,
// `mpConfigurado()` es false y todo el add-on queda inerte (la app funciona
// idéntica hasta que se conecten las llaves en el env de Vercel).
//
// Secrets esperados en el env (NUNCA en el repo):
//   MP_CLIENT_ID, MP_CLIENT_SECRET   → app de Gestionala en MP (OAuth)
//   MP_TOKEN_ENC_KEY                 → base64 de 32 bytes (AES-256-GCM de los tokens)
//   MP_WEBHOOK_SECRET                → validación de firma del webhook (x-signature)

export const MP_API = 'https://api.mercadopago.com';

export function mpConfigurado(): boolean {
  return !!process.env.MP_CLIENT_ID && !!process.env.MP_CLIENT_SECRET;
}

export function mpCredenciales(): { clientId: string; clientSecret: string } {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Mercado Pago no configurado (faltan MP_CLIENT_ID / MP_CLIENT_SECRET)');
  }
  return { clientId, clientSecret };
}

/** URL de redirect del OAuth (callback). Reusa NEXT_PUBLIC_SITE_URL como Flow. */
export function mpRedirectUri(origin?: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? origin ?? '';
  return `${base}/api/mp/oauth/callback`;
}
