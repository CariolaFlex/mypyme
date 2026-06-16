// Datos del titular del servicio para las páginas legales.
// Centralizados acá para editarlos en un solo lugar.
export const LEGAL = {
  marca: 'Gestionala',
  razonSocial: 'Vectium SpA', // titular del servicio
  // RUT confirmado: mismo titular que aparece públicamente en los documentos
  // legales de Farmateca (vectium.cl/farmateca/terms).
  rut: '78.312.836-5',
  // Domicilio social de Vectium SpA (alineado con los documentos legales de Farmateca).
  domicilio: 'El Trovador 4280, Oficina 307, Región Metropolitana, Chile',
  jurisdiccion: 'Santiago', // tribunales competentes (sigue al domicilio social)
  // Sin dominio propio aún: el servicio vive en la URL de Vercel. Cambiar a
  // gestionala.cl (u otro) cuando se compre el dominio (~10 clientes → compra automática).
  sitio: 'mypyme-blond.vercel.app',
  // Email de contacto/soporte real de Vectium. Cambiar a uno dedicado
  // (ej. soporte@gestionala.cl) cuando se cree, junto con el dominio.
  emailContacto: 'vectiumspa@gmail.com',
  // Fecha de última actualización de los textos legales.
  actualizado: '16 de junio de 2026',
} as const;

// Canal de soporte. El WhatsApp es opcional: si queda vacío, la tarjeta de
// WhatsApp NO se muestra en /soporte. Número en formato internacional SIN '+'
// ni espacios para el link wa.me (ej. '56912345678').
export const SOPORTE = {
  email: 'vectiumspa@gmail.com', // email real de soporte
  whatsapp: '56940337486', // WhatsApp de Vectium (+56 9 4033 7486), sin '+' ni espacios para wa.me
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
