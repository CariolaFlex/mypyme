'use client';

import { useState } from 'react';

// Tienda de prueba para el desafío de certificación Checkout Pro (persona natural,
// ver docs/13-mercadopago-certificacion-partners.md). No es parte de Gestionala.
export default function MpCertCheckoutProPage() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comprar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/mp-cert/preference', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error creando la preferencia');
      window.location.href = data.sandbox_init_point || data.init_point;
    } catch (err) {
      setError((err as Error).message);
      setCargando(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1>Tienda de prueba — Checkout Pro</h1>
      <p>Producto de prueba — certificación Checkout Pro</p>
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>$2.000 CLP</p>
      <button onClick={comprar} disabled={cargando}>
        {cargando ? 'Redirigiendo…' : 'Comprar con Mercado Pago'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  );
}
