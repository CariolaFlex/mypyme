'use client';

import { Modal } from '@/components/ui/modal';
import { AvisoHerramienta } from '@/components/aviso-herramienta';
import { BarcodeScanner } from './barcode-scanner';

/**
 * Modal con el escáner adentro. El scanner solo se monta (y enciende la cámara)
 * cuando `open` es true.
 */
export function BarcodeScannerModal({
  open,
  onScan,
  onClose,
  continuo = false,
  onToggleContinuo,
}: {
  open: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
  /** Modo continuo (escanear varios seguidos). */
  continuo?: boolean;
  /** Si se provee, muestra el toggle de escaneo continuo. */
  onToggleContinuo?: (v: boolean) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras">
      {open && (
        <div className="space-y-3">
          <BarcodeScanner onScan={onScan} onCancel={onClose} continuo={continuo} />
          {onToggleContinuo && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={continuo}
                onChange={(e) => onToggleContinuo(e.target.checked)}
                className="size-4 accent-primary"
              />
              Escaneo continuo (varios productos seguidos)
            </label>
          )}
          <AvisoHerramienta variante="barras" />
        </div>
      )}
    </Modal>
  );
}
