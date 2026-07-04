/**
 * Preprocesado de imagen de nivel profesional, 100% client-side (canvas + JS puro).
 *
 * Pipeline: corrección de perspectiva (detección de esquinas del papel + warp
 * homográfico) → deskew (rotación estimada por perfiles de proyección) → dos
 * variantes de salida: (a) gris + estiramiento de contraste por percentiles
 * (el comportamiento histórico, robusto a luz despareja) y (b) binarización
 * adaptativa Sauvola (gana en papel arrugado/sombras fuertes). El engine corre
 * OCR sobre las variantes y se queda con la de mayor confidence.
 *
 * TODO best-effort con guardas: si una etapa no detecta nada razonable se salta,
 * y si algo revienta se devuelve el archivo original. Nunca rompe el flujo.
 */

export interface VarianteImagen {
  nombre: string;
  blob: Blob;
}

/** Imagen de trabajo en escala de grises (evita ida y vuelta por ImageData). */
interface Gris {
  data: Uint8ClampedArray;
  w: number;
  h: number;
}

// ─── Carga y utilidades base ──────────────────────────────────────────────────

/** Carga el archivo a un canvas con el lado menor llevado a ~1500-2000px
 *  (Tesseract rinde mejor ahí). Upscale máx 2x; downscale si supera ~3.5MP
 *  (las integrales de Sauvola en fotos de 12MP se comen la RAM del teléfono). */
async function cargarGris(file: File | Blob): Promise<Gris | null> {
  const bitmap = await createImageBitmap(file);
  const minLado = Math.min(bitmap.width, bitmap.height);
  let escala = minLado > 0 && minLado < 1500 ? Math.min(2, 1500 / minLado) : 1;
  const MAX_PX = 3_500_000;
  if (bitmap.width * bitmap.height * escala * escala > MAX_PX) {
    escala = Math.sqrt(MAX_PX / (bitmap.width * bitmap.height));
  }
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const gris = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gris[p] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
  }
  return { data: gris, w, h };
}

/** Gris → Blob PNG (replica el gris en RGB; Tesseract lee RGB). */
async function grisABlob(g: Gris): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = g.w;
  canvas.height = g.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(g.w, g.h);
  const d = img.data;
  for (let p = 0, i = 0; p < g.data.length; p++, i += 4) {
    d[i] = d[i + 1] = d[i + 2] = g.data[p];
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
}

/** Reduce la imagen gris a un lado máximo dado (para análisis baratos). */
function reducir(g: Gris, maxLado: number): Gris {
  const f = Math.max(g.w, g.h) / maxLado;
  if (f <= 1) return g;
  const w = Math.round(g.w / f);
  const h = Math.round(g.h / f);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(g.h - 1, Math.round(y * f));
    for (let x = 0; x < w; x++) {
      out[y * w + x] = g.data[sy * g.w + Math.min(g.w - 1, Math.round(x * f))];
    }
  }
  return { data: out, w, h };
}

/** Umbral de Otsu a partir del histograma (separa papel de fondo/texto). */
function otsu(g: Gris): number {
  const hist = new Uint32Array(256);
  for (let p = 0; p < g.data.length; p++) hist[g.data[p]]++;
  const total = g.data.length;
  let suma = 0;
  for (let v = 0; v < 256; v++) suma += v * hist[v];
  let sumaB = 0;
  let wB = 0;
  let mejorVar = 0;
  let umbral = 127;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumaB += v * hist[v];
    const mB = sumaB / wB;
    const mF = (suma - sumaB) / wF;
    const entre = wB * wF * (mB - mF) * (mB - mF);
    if (entre > mejorVar) {
      mejorVar = entre;
      umbral = v;
    }
  }
  return umbral;
}

// ─── Corrección de perspectiva ────────────────────────────────────────────────

type Punto = { x: number; y: number };

/**
 * Detecta las 4 esquinas del documento (papel claro sobre fondo más oscuro) en
 * una versión reducida: umbral Otsu → máscara de "papel" filtrada por mayoría
 * 3×3 (saca ruido) → esquinas por extremos de x+y y x−y (TL/BR/TR/BL).
 * Devuelve null si el cuadrilátero no es creíble (muy chico, casi el frame
 * completo, o degenerado) — en ese caso no se corrige nada.
 */
function detectarEsquinas(g: Gris): [Punto, Punto, Punto, Punto] | null {
  const peq = reducir(g, 480);
  const { data, w, h } = peq;
  const umbral = otsu(peq);
  // Máscara de papel (claro). Si Otsu quedó muy abajo (imagen ya casi blanca,
  // p.ej. un escaneo), el papel ES todo el frame → nada que corregir.
  const mask = new Uint8Array(w * h);
  let claros = 0;
  for (let p = 0; p < data.length; p++) {
    if (data[p] > umbral) {
      mask[p] = 1;
      claros++;
    }
  }
  const frac = claros / (w * h);
  if (frac < 0.2 || frac > 0.92) return null;

  // Filtro de mayoría 3×3: un píxel sobrevive si ≥5 vecinos son papel.
  const filtrada = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) n += mask[(y + dy) * w + (x + dx)];
      if (n >= 5) filtrada[y * w + x] = 1;
    }
  }

  // Esquinas por extremos de las sumas/restas de coordenadas.
  let tl: Punto | null = null;
  let br: Punto | null = null;
  let tr: Punto | null = null;
  let bl: Punto | null = null;
  let minSum = Infinity;
  let maxSum = -Infinity;
  let minDif = Infinity;
  let maxDif = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filtrada[y * w + x]) continue;
      const s = x + y;
      const df = x - y;
      if (s < minSum) { minSum = s; tl = { x, y }; }
      if (s > maxSum) { maxSum = s; br = { x, y }; }
      if (df > maxDif) { maxDif = df; tr = { x, y }; }
      if (df < minDif) { minDif = df; bl = { x, y }; }
    }
  }
  if (!tl || !br || !tr || !bl) return null;

  // Validaciones: área razonable y que NO sea prácticamente el frame completo
  // (warpear el frame entero solo mete borrosidad de resampleo).
  const area = Math.abs(
    (tr.x - tl.x) * (bl.y - tl.y) - (bl.x - tl.x) * (tr.y - tl.y)
  ) / 2 + Math.abs(
    (tr.x - br.x) * (bl.y - br.y) - (bl.x - br.x) * (tr.y - br.y)
  ) / 2;
  const areaFrame = w * h;
  if (area < areaFrame * 0.25) return null;
  const margen = Math.max(w, h) * 0.03;
  const esFrame =
    tl.x < margen && tl.y < margen &&
    tr.x > w - 1 - margen && tr.y < margen &&
    bl.x < margen && bl.y > h - 1 - margen &&
    br.x > w - 1 - margen && br.y > h - 1 - margen;
  if (esFrame) return null;

  // Reescalar las esquinas a la resolución de trabajo.
  const fx = g.w / w;
  const fy = g.h / h;
  const up = (p: Punto): Punto => ({ x: p.x * fx, y: p.y * fy });
  return [up(tl), up(tr), up(br), up(bl)];
}

/** Resuelve el sistema lineal 8×8 (eliminación gaussiana con pivoteo parcial). */
function resolver8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M = A.map((fila, i) => [...fila, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((fila, i) => fila[n] / M[i][i]);
}

/**
 * Homografía dst→src (mapeo inverso) para muestrear el warp: por cada píxel del
 * rectángulo destino se busca el punto correspondiente dentro del cuadrilátero
 * origen con interpolación bilineal. Fondo blanco fuera de rango.
 */
function warpPerspectiva(g: Gris, esquinas: [Punto, Punto, Punto, Punto]): Gris | null {
  const [tl, tr, br, bl] = esquinas;
  const dist = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);
  const W = Math.round(Math.max(dist(tl, tr), dist(bl, br)));
  const H = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
  if (W < 200 || H < 200 || W * H > 4_500_000) return null;

  // DLT con 4 correspondencias (dst rect → src quad), h9 = 1.
  const src = [tl, tr, br, bl];
  const dst: Punto[] = [
    { x: 0, y: 0 },
    { x: W - 1, y: 0 },
    { x: W - 1, y: H - 1 },
    { x: 0, y: H - 1 },
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x: xd, y: yd } = dst[i];
    const { x: xs, y: ys } = src[i];
    A.push([xd, yd, 1, 0, 0, 0, -xd * xs, -yd * xs]);
    b.push(xs);
    A.push([0, 0, 0, xd, yd, 1, -xd * ys, -yd * ys]);
    b.push(ys);
  }
  const hm = resolver8(A, b);
  if (!hm) return null;
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hm;

  const out = new Uint8ClampedArray(W * H);
  const { data, w: sw, h: sh } = g;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const den = h6 * x + h7 * y + 1;
      const sx = (h0 * x + h1 * y + h2) / den;
      const sy = (h3 * x + h4 * y + h5) / den;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) {
        out[y * W + x] = 255;
        continue;
      }
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = data[y0 * sw + x0];
      const i10 = data[y0 * sw + x0 + 1];
      const i01 = data[(y0 + 1) * sw + x0];
      const i11 = data[(y0 + 1) * sw + x0 + 1];
      out[y * W + x] =
        i00 * (1 - fx) * (1 - fy) + i10 * fx * (1 - fy) + i01 * (1 - fx) * fy + i11 * fx * fy;
    }
  }
  return { data: out, w: W, h: H };
}

// ─── Deskew (corrección de rotación) ─────────────────────────────────────────

/**
 * Estima el ángulo de inclinación del texto (−12°…12°) maximizando la varianza
 * del perfil de proyección horizontal: cuando las líneas de texto quedan
 * horizontales, la proyección tiene picos (renglones) y valles (interlineado).
 * Trabaja sobre una muestra de píxeles oscuros de la imagen reducida — barato.
 */
function estimarAngulo(g: Gris): number {
  const peq = reducir(g, 800);
  const umbral = otsu(peq);
  // Muestra de píxeles de texto (oscuros), techo 40k para acotar el costo.
  const xs: number[] = [];
  const ys: number[] = [];
  const paso = Math.max(1, Math.floor(peq.data.length / 250_000));
  for (let p = 0; p < peq.data.length; p += paso) {
    if (peq.data[p] < umbral) {
      xs.push(p % peq.w);
      ys.push((p / peq.w) | 0);
      if (xs.length >= 40_000) break;
    }
  }
  if (xs.length < 500) return 0;

  const diag = Math.hypot(peq.w, peq.h);
  const nBins = Math.min(1024, Math.ceil(diag));
  const varianzaEn = (grados: number): number => {
    const rad = (grados * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const bins = new Float64Array(nBins);
    for (let i = 0; i < xs.length; i++) {
      // Coordenada de fila tras rotar: y·cosθ − x·sinθ (desplazada a ≥0).
      const fila = ys[i] * cos - xs[i] * sin + peq.w; // +w evita negativos
      const bin = Math.min(nBins - 1, Math.max(0, Math.floor((fila / (diag + peq.w)) * nBins)));
      bins[bin]++;
    }
    let media = 0;
    for (let i = 0; i < nBins; i++) media += bins[i];
    media /= nBins;
    let v = 0;
    for (let i = 0; i < nBins; i++) v += (bins[i] - media) * (bins[i] - media);
    return v;
  };

  // Barrido grueso (2°) y refinamiento fino (0.4°) alrededor del mejor.
  let mejor = 0;
  let mejorVar = -1;
  for (let a = -12; a <= 12; a += 2) {
    const v = varianzaEn(a);
    if (v > mejorVar) { mejorVar = v; mejor = a; }
  }
  let fino = mejor;
  for (let a = mejor - 1.6; a <= mejor + 1.6; a += 0.4) {
    const v = varianzaEn(a);
    if (v > mejorVar) { mejorVar = v; fino = a; }
  }
  return Math.abs(fino) < 0.5 ? 0 : fino;
}

/** Rota la imagen gris (mapeo inverso + bilineal), fondo blanco. */
function rotar(g: Gris, grados: number): Gris {
  const rad = (grados * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const { data, w, h } = g;
  const cx = w / 2;
  const cy = h / 2;
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const sx = dx * cos - dy * sin + cx;
      const sy = dx * sin + dy * cos + cy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) {
        out[y * w + x] = 255;
        continue;
      }
      const fx = sx - x0;
      const fy = sy - y0;
      out[y * w + x] =
        data[y0 * w + x0] * (1 - fx) * (1 - fy) +
        data[y0 * w + x0 + 1] * fx * (1 - fy) +
        data[(y0 + 1) * w + x0] * (1 - fx) * fy +
        data[(y0 + 1) * w + x0 + 1] * fx * fy;
    }
  }
  return { data: out, w, h };
}

// ─── Variantes de salida ─────────────────────────────────────────────────────

/** Estiramiento de contraste por percentiles 2%-98% (robusto a sombras). */
function estirarContraste(g: Gris): Gris {
  const hist = new Uint32Array(256);
  for (let p = 0; p < g.data.length; p++) hist[g.data[p]]++;
  const total = g.data.length;
  const percentil = (q: number): number => {
    const objetivo = total * q;
    let acum = 0;
    for (let v = 0; v < 256; v++) {
      acum += hist[v];
      if (acum >= objetivo) return v;
    }
    return 255;
  };
  const lo = percentil(0.02);
  const hi = percentil(0.98);
  const rango = Math.max(1, hi - lo);
  const out = new Uint8ClampedArray(g.data.length);
  for (let p = 0; p < g.data.length; p++) {
    out[p] = ((g.data[p] - lo) * 255) / rango;
  }
  return { data: out, w: g.w, h: g.h };
}

/**
 * Binarización adaptativa Sauvola: umbral local T = m·(1 + k·(s/R − 1)) por
 * ventana, con media (m) y desviación (s) calculadas en O(1) por píxel vía
 * imágenes integrales. Aguanta luz despareja donde un umbral global rompe.
 */
function sauvola(g: Gris, ventana = 31, k = 0.2): Gris {
  const { data, w, h } = g;
  const R = 128;
  const half = ventana >> 1;

  // Integrales (fila 0 y columna 0 en cero para simplificar los bordes).
  const iw = w + 1;
  const suma = new Float64Array((w + 1) * (h + 1));
  const suma2 = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let accS = 0;
    let accS2 = 0;
    for (let x = 1; x <= w; x++) {
      const v = data[(y - 1) * w + (x - 1)];
      accS += v;
      accS2 += v * v;
      suma[y * iw + x] = suma[(y - 1) * iw + x] + accS;
      suma2[y * iw + x] = suma2[(y - 1) * iw + x] + accS2;
    }
  }

  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(w - 1, x + half);
      const n = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s =
        suma[(y1 + 1) * iw + (x1 + 1)] - suma[y0 * iw + (x1 + 1)] -
        suma[(y1 + 1) * iw + x0] + suma[y0 * iw + x0];
      const s2 =
        suma2[(y1 + 1) * iw + (x1 + 1)] - suma2[y0 * iw + (x1 + 1)] -
        suma2[(y1 + 1) * iw + x0] + suma2[y0 * iw + x0];
      const media = s / n;
      const varza = Math.max(0, s2 / n - media * media);
      const T = media * (1 + k * (Math.sqrt(varza) / R - 1));
      out[y * w + x] = data[y * w + x] > T ? 255 : 0;
    }
  }
  return { data: out, w, h };
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Genera las variantes de preprocesado sobre las que el engine corre OCR y
 * elige la de mayor confidence. Orden: la primera es la más parecida al
 * pipeline histórico (contraste), la segunda la Sauvola. Perspectiva y deskew
 * se aplican (si se detectan) a la base común de ambas.
 */
export async function generarVariantes(file: File): Promise<VarianteImagen[]> {
  try {
    let g = await cargarGris(file);
    if (!g) return [{ nombre: 'original', blob: file }];

    // 1) Perspectiva (best-effort, con guardas).
    try {
      const esquinas = detectarEsquinas(g);
      if (esquinas) {
        const warp = warpPerspectiva(g, esquinas);
        if (warp) g = warp;
      }
    } catch {
      /* sin corrección: seguir con la imagen tal cual */
    }

    // 2) Deskew.
    try {
      const angulo = estimarAngulo(g);
      if (angulo !== 0) g = rotar(g, angulo);
    } catch {
      /* ídem */
    }

    // 3) Variantes.
    const variantes: VarianteImagen[] = [];
    const contraste = await grisABlob(estirarContraste(g));
    if (contraste) variantes.push({ nombre: 'contraste', blob: contraste });
    try {
      // Ventana proporcional al tamaño (~1/50 del lado menor, impar, 15-45).
      const lado = Math.min(g.w, g.h);
      let ventana = Math.max(15, Math.min(45, Math.round(lado / 50)));
      if (ventana % 2 === 0) ventana++;
      const bin = await grisABlob(sauvola(g, ventana));
      if (bin) variantes.push({ nombre: 'sauvola', blob: bin });
    } catch {
      /* Sauvola es opcional: con la variante de contraste alcanza */
    }
    return variantes.length ? variantes : [{ nombre: 'original', blob: file }];
  } catch {
    return [{ nombre: 'original', blob: file }];
  }
}

/**
 * Compat: preprocesado simple (la primera variante). La usa quien no quiere el
 * ciclo multi-variante del engine. Si algo falla, devuelve el original.
 */
export async function preprocesarImagen(file: File): Promise<Blob> {
  const variantes = await generarVariantes(file);
  return variantes[0]?.blob ?? file;
}
