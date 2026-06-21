'use client';

import { Modal } from '@/components/ui/modal';
import { BarcodeScanner } from './barcode-scanner';

/**
 * Modal con el escáner adentro. El scanner solo se monta (y enciende la cámara)
 * cuando `open` es true.
 */
export function BarcodeScannerModal({
  open,
  onScan,
  onClose,
}: {
  open: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Escanear código de barras">
      {open && <BarcodeScanner onScan={onScan} onCancel={onClose} />}
    </Modal>
  );
}
