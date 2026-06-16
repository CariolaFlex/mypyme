// Envío de emails transaccionales vía Resend. Inerte si no hay RESEND_API_KEY:
// emailConfigurado() es false y las funciones no-op (la app sigue igual).
import { Resend } from 'resend';

export function emailConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// El remitente debe ser de un dominio verificado en Resend.
const FROM = process.env.RESEND_FROM ?? 'Gestionala <no-reply@mypyme.cl>';

/** Email de bienvenida tras activarse la suscripción. Best-effort: nunca lanza. */
export async function enviarBienvenidaSuscripcion(p: {
  to: string;
  nombreNegocio: string;
}): Promise<boolean> {
  if (!emailConfigurado()) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: p.to,
      subject: '¡Tu suscripción a Gestionala está activa! 🎉',
      html: `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0d1b2a">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#0d1b2a,#475569);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px">G</div>
          <h1 style="font-size:20px;margin:20px 0 8px">¡Bienvenido a Gestionala!</h1>
          <p style="color:#555;line-height:1.6;margin:0 0 16px">
            La suscripción de <strong>${p.nombreNegocio}</strong> quedó activa. Ya puedes vender,
            controlar tu inventario y ver tus reportes sin límites. Los cargos mensuales se realizan
            automáticamente.
          </p>
          <a href="https://mypyme-blond.vercel.app" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">
            Ir a mi negocio
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            ¿Dudas? Responde este correo y te ayudamos.
          </p>
        </div>
      `,
    });
    if (error) {
      console.error('Resend error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend excepción:', e);
    return false;
  }
}
