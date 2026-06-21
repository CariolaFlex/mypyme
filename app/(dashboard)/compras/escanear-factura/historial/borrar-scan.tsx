'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { eliminarScan } from '../actions';

export function BorrarScan({ scanId }: { scanId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      aria-label="Eliminar escaneo"
      className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        const res = await eliminarScan(scanId);
        setBusy(false);
        if ('error' in res) toast.error(res.error);
        else toast.success('Escaneo eliminado');
      }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
