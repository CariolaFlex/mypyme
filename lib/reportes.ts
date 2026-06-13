// Utilidades de reportes (Fase 5): cortes de fecha en hora Chile + formatos.
// Los RPCs reciben rangos [desde, hasta) en UTC; acá calculamos los bordes
// de "hoy" / "este mes" según el reloj real del local (America/Santiago).

const TZ = 'America/Santiago';

/** Instante UTC que corresponde a las 00:00 (hora Santiago) del día de `d`. */
export function inicioDiaSantiago(d: Date = new Date()): Date {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = Number(p.find((x) => x.type === 'year')!.value);
  const m = Number(p.find((x) => x.type === 'month')!.value);
  const day = Number(p.find((x) => x.type === 'day')!.value);
  return zonedMidnightToUtc(y, m, day);
}

/** Instante UTC de las 00:00 (hora Santiago) del primer día del mes de `d`. */
export function inicioMesSantiago(d: Date = new Date()): Date {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit',
  }).formatToParts(d);
  const y = Number(p.find((x) => x.type === 'year')!.value);
  const m = Number(p.find((x) => x.type === 'month')!.value);
  return zonedMidnightToUtc(y, m, 1);
}

/** Snap a las 00:00 (hora Santiago) de hace `n` días (incluyendo hoy si n=6 → 7 días). */
export function inicioHaceDias(n: number, d: Date = new Date()): Date {
  return inicioDiaSantiago(new Date(d.getTime() - n * 86_400_000));
}

// Convierte una medianoche en hora Santiago al instante UTC equivalente,
// corrigiendo el offset (incl. DST) con el truco estándar de doble locale.
function zonedMidnightToUtc(y: number, m: number, day: number): Date {
  const guess = Date.UTC(y, m - 1, day, 0, 0, 0);
  const tz = new Date(new Date(guess).toLocaleString('en-US', { timeZone: TZ }));
  const utc = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess - (tz.getTime() - utc.getTime()));
}

export const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

// Las fechas de los reportes vienen como 'YYYY-MM-DD' (date-only). NO usar
// new Date(s): parsea como medianoche UTC y en tz negativa retrocede un día.
// Reformateamos el string a DD-MM-YY directamente.
export const fmtFecha = (s: string | null) => {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}-${m}-${y.slice(2)}`;
};

export const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
