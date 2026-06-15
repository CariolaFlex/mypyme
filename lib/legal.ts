// Datos del titular del servicio para las páginas legales.
// BORRADOR: Andrés define/aprueba estos valores en el Sprint 5 (dominio, razón
// social y contacto definitivos). Centralizados acá para editarlos en un solo lugar.
export const LEGAL = {
  marca: 'mypyme',
  razonSocial: 'Vectium SpA', // titular del servicio
  rut: '[RUT por definir]',
  domicilio: 'La Serena, Región de Coquimbo, Chile',
  sitio: 'mypyme.cl', // dominio definitivo por definir (Sprint 5)
  emailContacto: 'contacto@mypyme.cl', // por definir (Sprint 5)
  // Fecha de última actualización de los textos legales.
  actualizado: '14 de junio de 2026',
} as const;

// Canal de soporte. BORRADOR: Andrés define el WhatsApp definitivo (Sprint 5).
// El número va en formato internacional SIN '+' ni espacios para el link wa.me.
export const SOPORTE = {
  email: 'soporte@mypyme.cl', // por definir (Sprint 5)
  whatsapp: '56900000000', // [número por definir] formato 56 9 XXXX XXXX
  horario: 'Lun a Vie, 9:00–18:00 hrs',
  // Mensaje pre-cargado al abrir WhatsApp.
  mensajeWhatsapp: 'Hola, necesito ayuda con mypyme.',
} as const;

/** Link wa.me con mensaje pre-cargado. */
export function whatsappUrl(): string {
  return `https://wa.me/${SOPORTE.whatsapp}?text=${encodeURIComponent(SOPORTE.mensajeWhatsapp)}`;
}

/** Link mailto de soporte con asunto. */
export function mailtoSoporte(): string {
  return `mailto:${SOPORTE.email}?subject=${encodeURIComponent('Soporte mypyme')}`;
}
