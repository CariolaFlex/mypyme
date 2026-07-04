'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook de escaneo de códigos de barras / QR por cámara (100% en el navegador).
 *
 * Estrategia de doble motor:
 *  1. `BarcodeDetector` nativo (Chrome/Android, Edge) — rápido, sin descargar nada.
 *  2. Fallback `@zxing/browser` (WASM) para Safari/iOS, donde `BarcodeDetector`
 *     NO existe ni en iOS 17.
 *
 * Requiere HTTPS para `getUserMedia` (Vercel ya lo provee; en local funciona en
 * localhost). Pide la cámara trasera (`facingMode: environment`).
 */

export type ScannerState = 'idle' | 'starting' | 'scanning' | 'error';

// Formatos de retail (EAN/UPC) + Code128/39 + QR + industriales/logísticos:
// Data Matrix (farmacia/electrónica), PDF417 (documentos/carnets), Aztec
// (tickets) e ITF (cajas máster de distribuidores). El fallback ZXing los
// decodifica por defecto; esta lista solo aplica al detector nativo.
const FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code',
  'data_matrix', 'pdf417', 'aztec', 'itf',
];

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface BarcodeDetectorCtor {
  new (opts: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?(): Promise<string[]>;
}

export function useBarcodeScanner(
  onDetected: (code: string) => void,
  opts?: {
    continuo?: boolean;
    /** En modo continuo: no re-emitir un código YA emitido en esta sesión de
     *  cámara (deduplicación para carga masiva de inventario). */
    dedupeSesion?: boolean;
  }
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<ScannerState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Permite que el callback cambie sin reiniciar la cámara.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Modo continuo: no frena tras la 1ª lectura (escanea varios seguidos). Se lee
  // por ref para no reiniciar la cámara al alternarlo.
  const continuoRef = useRef(!!opts?.continuo);
  useEffect(() => {
    continuoRef.current = !!opts?.continuo;
  }, [opts?.continuo]);
  const dedupeSesionRef = useRef(!!opts?.dedupeSesion);
  useEffect(() => {
    dedupeSesionRef.current = !!opts?.dedupeSesion;
  }, [opts?.dedupeSesion]);

  // Limpieza activa (se reasigna en cada start).
  const cleanupRef = useRef<() => void>(() => {});
  const doneRef = useRef(false);

  const stop = useCallback(() => {
    cleanupRef.current();
    cleanupRef.current = () => {};
    setState('idle');
  }, []);

  const start = useCallback(async () => {
    doneRef.current = false;
    setError(null);
    setState('starting');

    let cancelled = false;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let zxingStop: (() => void) | null = null;

    const cleanup = () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (zxingStop) zxingStop();
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const v = videoRef.current;
      if (v) v.srcObject = null;
    };
    cleanupRef.current = cleanup;

    let lastCode = '';
    let lastAt = 0;
    const vistos = new Set<string>();
    const emit = (code: string) => {
      if (cancelled) return;
      const clean = code.trim();
      if (!clean) return;
      if (continuoRef.current) {
        // Sigue escaneando; ignora el MISMO código repetido dentro de ~1,5s
        // (la cámara lee el mismo frame muchas veces). Con dedupeSesion, un
        // código ya emitido no se repite en toda la sesión de cámara (carga
        // masiva: pasar dos veces por el mismo producto no duplica).
        if (dedupeSesionRef.current && vistos.has(clean)) return;
        const now = Date.now();
        if (clean === lastCode && now - lastAt < 1500) return;
        lastCode = clean;
        lastAt = now;
        vistos.add(clean);
        onDetectedRef.current(clean);
      } else {
        if (doneRef.current) return;
        doneRef.current = true;
        onDetectedRef.current(clean);
      }
    };

    try {
      const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

      if (BD) {
        // ── Motor nativo ──────────────────────────────────────────────
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) return cleanup();
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setState('scanning');

        const supported = (await BD.getSupportedFormats?.()) ?? FORMATS;
        const detector = new BD({ formats: FORMATS.filter((f) => supported.includes(f)) });

        const tick = async () => {
          if (cancelled || doneRef.current) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) emit(codes[0].rawValue);
          } catch {
            /* frame ilegible: seguir */
          }
          // En modo continuo doneRef nunca se marca → el loop sigue vivo.
          if (cancelled || doneRef.current) return;
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } else {
        // ── Fallback WASM (Safari/iOS) ────────────────────────────────
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video,
          (result) => {
            if (result) emit(result.getText());
          }
        );
        zxingStop = () => controls.stop();
        if (cancelled) return cleanup();
        setState('scanning');
      }
    } catch (e) {
      if (cancelled) return;
      setState('error');
      const name = (e as Error)?.name;
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Permiso de cámara denegado. Habilítalo en el navegador.'
          : name === 'NotFoundError'
            ? 'No se encontró ninguna cámara en este dispositivo.'
            : 'No se pudo abrir la cámara. Revisa los permisos e inténtalo de nuevo.'
      );
    }
  }, []);

  // Cierre seguro si el componente se desmonta con la cámara abierta.
  useEffect(() => () => cleanupRef.current(), []);

  return { videoRef, state, error, start, stop };
}
