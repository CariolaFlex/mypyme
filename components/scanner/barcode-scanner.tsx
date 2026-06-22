'use client';

import { useEffect } from 'react';
import { Camera, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBarcodeScanner } from './use-barcode-scanner';

/**
 * Vista de cámara para escanear un código. Se monta cuando el modal abre y
 * arranca la cámara sola; al desmontarse la apaga. Reusable (form de producto,
 * y a futuro el POS).
 */
export function BarcodeScanner({
  onScan,
  onCancel,
  continuo = false,
}: {
  onScan: (code: string) => void;
  onCancel: () => void;
  /** Si true, no frena tras la 1ª lectura (escanea varios seguidos). */
  continuo?: boolean;
}) {
  // Al escanear, el padre cierra el modal → este componente se desmonta → el
  // cleanup del effect apaga la cámara. No hace falta llamar stop() acá.
  const { videoRef, state, error, start, stop } = useBarcodeScanner(onScan, { continuo });

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="size-full object-cover"
        />

        {/* Marco guía */}
        {state === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/3 w-3/4 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}

        {/* Cargando */}
        {state === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm">Abriendo cámara…</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-white">
            <AlertTriangle className="size-6 text-amber-400" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {state === 'scanning'
          ? 'Apunta al código de barras del producto.'
          : 'Usa la cámara trasera para escanear.'}
      </p>

      <div className="flex justify-end gap-2">
        {state === 'error' && (
          <Button type="button" variant="outline" size="sm" onClick={() => start()}>
            <Camera className="size-4" /> Reintentar
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
