import { NextRequest, NextResponse } from 'next/server';
import { crearPreferenciaCert, mpCertConfigurado } from '@/lib/mp-cert/client';

export async function POST(req: NextRequest) {
  if (!mpCertConfigurado()) {
    return NextResponse.json({ error: 'MP_CERT_ACCESS_TOKEN no configurado' }, { status: 503 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const externalReference = `cert-${crypto.randomUUID()}`;
  try {
    const preferencia = await crearPreferenciaCert(siteUrl, externalReference);
    return NextResponse.json(preferencia);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
