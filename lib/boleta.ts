// Comprobante de venta imprimible (cliente). Formato térmico 80mm.
//
// NO es un documento tributario (boleta electrónica SII = Fase 9). Es un
// comprobante interno para entregar al cliente. Se imprime vía iframe oculto
// (evita el bloqueo de popups) y funciona offline (todo se arma en el cliente).

export type NegocioBoleta = {
  razonSocial: string;
  rut: string;
  giro?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  usaIva: boolean;
  tasaIva: number;
};

export type LineaBoleta = { nombre: string; cantidad: number; precioUnit: number; subtotal: number };
export type PagoBoleta = { nombre: string; monto: number };

export type BoletaData = {
  negocio: NegocioBoleta;
  lineas: LineaBoleta[];
  total: number;
  pagos: PagoBoleta[];
  vuelto: number;
  fecha: Date;
  /** Referencia corta (no es folio tributario). */
  ref: string;
};

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function fmtFechaHora(d: Date) {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(d);
}

export function boletaHtml(data: BoletaData): string {
  const { negocio, lineas, total, pagos, vuelto, fecha, ref } = data;

  // Desglose IVA: precios incluyen IVA → neto derivado (igual que en la app).
  let netoIvaHtml = '';
  if (negocio.usaIva && negocio.tasaIva > 0) {
    const neto = Math.round(total / (1 + negocio.tasaIva / 100));
    const iva = total - neto;
    netoIvaHtml = `
      <div class="row"><span>Neto</span><span>${clp.format(neto)}</span></div>
      <div class="row"><span>IVA (${negocio.tasaIva}%)</span><span>${clp.format(iva)}</span></div>`;
  }

  const lineasHtml = lineas
    .map(
      (l) => `
      <div class="item">
        <div class="item-nom">${esc(l.nombre)}</div>
        <div class="row">
          <span>${l.cantidad} × ${clp.format(l.precioUnit)}</span>
          <span>${clp.format(l.subtotal)}</span>
        </div>
      </div>`
    )
    .join('');

  const pagosHtml = pagos
    .map((p) => `<div class="row"><span>${esc(p.nombre)}</span><span>${clp.format(p.monto)}</span></div>`)
    .join('');

  const datos = [negocio.giro, negocio.direccion, negocio.telefono]
    .filter((x): x is string => Boolean(x))
    .map(esc);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Comprobante ${esc(ref)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 80mm; margin: 0; padding: 4mm; font-family: "Courier New", monospace; font-size: 12px; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .lg { font-size: 14px; }
  .muted { color: #333; font-size: 11px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .item { margin-bottom: 4px; }
  .item-nom { font-weight: 600; }
  .total { font-size: 15px; font-weight: 700; }
  .foot { margin-top: 8px; font-size: 10px; }
</style></head><body>
  <div class="center bold lg">${esc(negocio.razonSocial)}</div>
  <div class="center muted">RUT: ${esc(negocio.rut)}</div>
  ${datos.map((d) => `<div class="center muted">${d}</div>`).join('')}
  <hr>
  <div class="row muted"><span>${fmtFechaHora(fecha)}</span><span>N° ${esc(ref)}</span></div>
  <hr>
  ${lineasHtml}
  <hr>
  ${netoIvaHtml}
  <div class="row total"><span>TOTAL</span><span>${clp.format(total)}</span></div>
  <hr>
  ${pagosHtml}
  ${vuelto > 0 ? `<div class="row"><span>Vuelto</span><span>${clp.format(vuelto)}</span></div>` : ''}
  <div class="center foot">Comprobante interno — no válido como documento tributario.</div>
  <div class="center foot">¡Gracias por su compra!</div>
</body></html>`;
}

/** Imprime el comprobante en un iframe oculto (no bloquea popups, no navega). */
export function imprimirBoleta(data: BoletaData): void {
  if (typeof window === 'undefined') return;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(boletaHtml(data));
  doc.close();

  const win = iframe.contentWindow!;
  const limpiar = () => setTimeout(() => iframe.remove(), 1000);
  win.onafterprint = limpiar;
  // Espera al render antes de imprimir.
  setTimeout(() => {
    win.focus();
    win.print();
    // Fallback de limpieza si onafterprint no dispara (algunos navegadores).
    setTimeout(limpiar, 60_000);
  }, 150);
}
