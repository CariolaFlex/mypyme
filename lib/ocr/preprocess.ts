/**
 * Preprocesa la imagen antes de Tesseract para subir la precisión del OCR.
 * 100% client-side (canvas). Pasos: escala de grises + estiramiento de contraste
 * (por percentiles, robusto a sombras) + upscale si la foto es chica. NO binariza
 * a full (las fotos de celular tienen luz despareja → un umbral global rompe zonas).
 *
 * Si algo falla, devuelve el archivo original (best-effort, nunca rompe el flujo).
 */
export async function preprocesarImagen(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    // Tesseract rinde mejor con el lado menor ~1500-2000px. Upscale si es chica
    // (hasta 2x); no se hace downscale para no perder detalle del texto.
    const minLado = Math.min(bitmap.width, bitmap.height);
    const escala = minLado > 0 && minLado < 1500 ? Math.min(2, 1500 / minLado) : 1;
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const n = d.length / 4;

    // 1) Escala de grises (luma) + histograma.
    const gris = new Uint8ClampedArray(n);
    const hist = new Uint32Array(256);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      gris[p] = g;
      hist[g]++;
    }

    // 2) Percentiles 2% y 98% para estirar el contraste sin que un par de píxeles
    //    extremos (brillos/sombras) aplasten el rango.
    const lo = percentil(hist, n, 0.02);
    const hi = percentil(hist, n, 0.98);
    const rango = Math.max(1, hi - lo);

    // 3) Aplica el estiramiento a los 3 canales (queda gris pero Tesseract lee RGB).
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let v = ((gris[p] - lo) * 255) / rango;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Valor de gris en el percentil pedido a partir del histograma acumulado. */
function percentil(hist: Uint32Array, total: number, q: number): number {
  const objetivo = total * q;
  let acum = 0;
  for (let v = 0; v < 256; v++) {
    acum += hist[v];
    if (acum >= objetivo) return v;
  }
  return 255;
}
