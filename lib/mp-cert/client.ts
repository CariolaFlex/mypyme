// Cliente de Checkout Pro para el desafío de certificación personal de Andrés en el
// <dev>program de Mercado Pago. NO es parte del producto Gestionala/mypyme: es un
// checkout de prueba aislado (ver docs/13-mercadopago-certificacion-partners.md §4 Fase 1).
// Usa el SDK oficial "mercadopago" (Server-Side) con credenciales de prueba propias
// (MP_CERT_*), separadas de MP_CLIENT_ID/SECRET de Point. Se elimina o se deja inerte
// una vez aprobada la certificación.
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

export function mpCertConfigurado(): boolean {
  return !!process.env.MP_CERT_ACCESS_TOKEN;
}

// Integrator ID del desafío de certificación Checkout Pro (dado por MP en la etapa 4
// del wizard, específico de este desafío — no es el Integrator ID final del programa).
const CERT_INTEGRATOR_ID = 'dev_24c65fb163bf11ea96500242ac130004';

function client(): MercadoPagoConfig {
  const accessToken = process.env.MP_CERT_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_CERT_ACCESS_TOKEN no configurado');
  return new MercadoPagoConfig({
    accessToken,
    options: { integratorId: CERT_INTEGRATOR_ID },
  });
}

export type MpCertPreferencia = {
  id: string;
  init_point: string;
  sandbox_init_point: string;
};

/**
 * Crea la preferencia de pago del producto de prueba del desafío Checkout Pro.
 * Specs exigidas por la etapa 4 del wizard ("Configura tu integración"):
 *  - id de 4 dígitos, descripción EXACTA "Dispositivo de tienda móvil de comercio
 *    electrónico", cantidad 1, precio > US$1.
 *  - Máximo 6 cuotas con crédito, excluir Visa.
 *  - external_reference = correo de la cuenta de Mercado Pago (MP_CERT_EXTERNAL_REF_EMAIL).
 */
export async function crearPreferenciaCert(siteUrl: string): Promise<MpCertPreferencia> {
  const externalReference = process.env.MP_CERT_EXTERNAL_REF_EMAIL;
  if (!externalReference) throw new Error('MP_CERT_EXTERNAL_REF_EMAIL no configurado');

  const preference = new Preference(client());
  const resultado = await preference.create({
    body: {
      items: [
        {
          id: '4210',
          title: 'Producto de prueba — certificación Checkout Pro',
          description: 'Dispositivo de tienda móvil de comercio electrónico',
          picture_url: 'https://placehold.co/300x300?text=Cert+MP',
          quantity: 1,
          unit_price: 5000, // CLP, ampliamente sobre US$1
          currency_id: 'CLP',
        },
      ],
      payment_methods: {
        installments: 6,
        excluded_payment_methods: [{ id: 'visa' }],
      },
      external_reference: externalReference,
      back_urls: {
        success: `${siteUrl}/mp-cert-checkout-pro/retorno?status=success`,
        failure: `${siteUrl}/mp-cert-checkout-pro/retorno?status=failure`,
        pending: `${siteUrl}/mp-cert-checkout-pro/retorno?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/webhooks/mp-cert`,
    },
  });
  return {
    id: String(resultado.id ?? ''),
    init_point: String(resultado.init_point ?? ''),
    sandbox_init_point: String(resultado.sandbox_init_point ?? ''),
  };
}

/** Consulta un pago por ID (usado por el webhook tras recibir la notificación). */
export async function obtenerPagoCert(paymentId: string): Promise<Record<string, unknown>> {
  const payment = new Payment(client());
  const resultado = await payment.get({ id: paymentId });
  return resultado as unknown as Record<string, unknown>;
}
