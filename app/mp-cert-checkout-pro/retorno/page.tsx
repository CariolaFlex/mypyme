// URL de retorno (back_urls) compartida para success/failure/pending del desafío
// Checkout Pro. MP agrega sus propios query params (payment_id, status,
// external_reference, merchant_order_id) además del `status` que fijamos nosotros.
export default async function RetornoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1>Resultado del pago</h1>
      <pre style={{ background: '#f4f4f4', padding: '1rem', overflowX: 'auto' }}>
        {JSON.stringify(params, null, 2)}
      </pre>
    </main>
  );
}
