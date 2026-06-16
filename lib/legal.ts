// Datos del titular del servicio para las páginas legales.
// BORRADOR: Andrés define/aprueba estos valores en el Sprint 5 (dominio, razón
// social y contacto definitivos). Centralizados acá para editarlos en un solo lugar.
export const LEGAL = {
  marca: 'Gestionala',
  razonSocial: 'Vectium SpA', // titular del servicio
  // ⚠️ VERIFICAR ANDRÉS: tomado del registro de la empresa en la app (cuenta
  // Vectium SpA). Confirmar que es el RUT real antes de uso legal definitivo.
  rut: '78.312.836-5',
  domicilio: 'La Serena, Región de Coquimbo, Chile',
  // Sin dominio aún: el servicio vive en la URL de Vercel. Cambiar a mypyme.cl
  // (u otro) cuando se compre el dominio.
  sitio: 'mypyme-blond.vercel.app',
  emailContacto: 'vectiumspa@gmail.com', // email real de Vectium (cambiar a contacto@dominio con dominio propio)
  // Fecha de última actualización de los textos legales.
  actualizado: '15 de junio de 2026',
} as const;

// Canal de soporte. El WhatsApp es opcional: si queda vacío, la tarjeta de
// WhatsApp NO se muestra en /soporte. Número en formato internacional SIN '+'
// ni espacios para el link wa.me (ej. '56912345678').
export const SOPORTE = {
  email: 'vectiumspa@gmail.com', // email real de soporte
  whatsapp: '', // ⚠️ ANDRÉS: pega tu número '569XXXXXXXX' para activar la tarjeta de WhatsApp
  horario: 'Lun a Vie, 9:00–18:00 hrs',
  // Mensaje pre-cargado al abrir WhatsApp.
  mensajeWhatsapp: 'Hola, necesito ayuda con Gestionala.',
} as const;

/** Link wa.me con mensaje pre-cargado. */
export function whatsappUrl(): string {
  return `https://wa.me/${SOPORTE.whatsapp}?text=${encodeURIComponent(SOPORTE.mensajeWhatsapp)}`;
}

/** Link mailto de soporte con asunto. */
export function mailtoSoporte(): string {
  return `mailto:${SOPORTE.email}?subject=${encodeURIComponent('Soporte Gestionala')}`;
}
