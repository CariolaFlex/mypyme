'use client';

import Script from 'next/script';
import { useState } from 'react';

// Tienda de prueba para el desafío de certificación Checkout Pro (persona natural,
// ver docs/13-mercadopago-certificacion-partners.md). No es parte de Gestionala.
// Client-Side: usa el SDK oficial MercadoPago.js (Wallet Brick) — requisito explícito
// del desafío ("Instala el SDK de Mercado Pago" en backend y frontend).
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string) => {
      bricks: () => {
        create: (
          type: string,
          containerId: string,
          settings: { initialization: { preferenceId: string } }
        ) => Promise<void>;
      };
    };
  }
}

export default function MpCertCheckoutProPage() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkListo, setSdkListo] = useState(false);

  async function comprar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/mp-cert/preference', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creando la preferencia');

      const publicKey = process.env.NEXT_PUBLIC_MP_CERT_PUBLIC_KEY;
      if (!sdkListo || !publicKey || !window.MercadoPago) {
        // Fallback si el SDK no cargó: redirección directa al checkout.
        window.location.href = data.sandbox_init_point || data.init_point;
        return;
      }
      const mp = new window.MercadoPago(publicKey);
      await mp.bricks().create('wallet', 'walletBrick_container', {
        initialization: { preferenceId: data.id },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <Script src="https://sdk.mercadopago.com/js/v2" onLoad={() => setSdkListo(true)} />
      <h1>Tienda de prueba — Checkout Pro</h1>
      <p>Producto de prueba — certificación Checkout Pro</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$2.000 CLP</p>
      <button onClick={comprar} disabled={cargando}>
        {cargando ? 'Cargando…' : 'Comprar con Mercado Pago'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div id="walletBrick_container" />
    </main>
  );
}
