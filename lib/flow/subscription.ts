// Lógica de suscripción independiente de Flow (pura, testeable).
// El estado vive en empresas.estado_suscripcion; el webhook lo actualiza.

export type EstadoSuscripcion = 'trial' | 'activa' | 'morosa' | 'cancelada' | 'suspendida';

export const PLANES = {
  emprende: { nombre: 'Emprende', precioMensual: 9990 },
  pyme: { nombre: 'Pyme', precioMensual: 19990 },
} as const;

export type PlanKey = keyof typeof PLANES;

/**
 * Mapea el status de un pago/suscripción de Flow a nuestro estado interno.
 * Flow payment status: 1=pendiente, 2=pagado, 3=rechazado, 4=anulado.
 * `morose` indica mora en la suscripción recurrente.
 */
export function estadoDesdeFlow(flowStatus: number, morose = false): EstadoSuscripcion {
  if (morose) return 'morosa';
  switch (flowStatus) {
    case 2: return 'activa';   // pagado
    case 4: return 'cancelada';
    case 3: return 'morosa';   // rechazado
    default: return 'trial';   // 1 pendiente u otros
  }
}

/** Días que faltan para que termine el trial (negativo = ya venció). null si no aplica. */
export function diasRestantesTrial(
  trialTerminaEn: string | Date | null,
  ahora: Date = new Date()
): number | null {
  if (!trialTerminaEn) return null;
  const fin = typeof trialTerminaEn === 'string' ? new Date(trialTerminaEn) : trialTerminaEn;
  if (Number.isNaN(fin.getTime())) return null;
  return Math.ceil((fin.getTime() - ahora.getTime()) / 86_400_000);
}

/**
 * ¿La empresa tiene acceso a la app?
 * - activa: siempre.
 * - trial: mientras no haya vencido.
 * - morosa/cancelada/suspendida: no.
 */
export function tieneAcceso(
  estado: string,
  trialTerminaEn: string | Date | null,
  ahora: Date = new Date()
): boolean {
  if (estado === 'activa') return true;
  if (estado === 'trial') {
    const dias = diasRestantesTrial(trialTerminaEn, ahora);
    return dias === null || dias >= 0;
  }
  return false;
}

/** El enforcement de suscripción solo se activa con esta env (default: off). */
export function enforcementActivo(): boolean {
  return process.env.FLOW_ENFORCE === 'true';
}
