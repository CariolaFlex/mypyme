'use client';

import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { BarcodeScannerModal } from './barcode-scanner-modal';

/**
 * Campo "Código de barras" con botón de cámara. Es un island client que vive
 * dentro del <form> de la server action (alta o edición de producto): al
 * escanear, escribe el código en el input y hace lookup en la DB para avisar
 * si ese código ya pertenece a otro producto (evita duplicados; el índice único
 * lo rechazaría igual, pero así el aviso es inmediato).
 */
export function CodigoConEscaner({
  id = 'codigo_barras',
  name = 'codigo_barras',
  defaultValue = '',
  value: valueProp,
  onValueChange,
  onScanned,
  excludeId,
}: {
  id?: string;
  name?: string;
  defaultValue?: string;
  /** Modo controlado (opcional): si se pasa `value`, el padre maneja el estado. */
  value?: string;
  onValueChange?: (v: string) => void;
  /** Se dispara SOLO al escanear con la cámara (no al tipear). Para enriquecer. */
  onScanned?: (code: string) => void;
  /** En edición, no avisar si el match es el propio producto. */
  excludeId?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : internal;
  const setValue = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  };
  const [open, setOpen] = useState(false);

  async function lookup(code: string) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('productos')
        .select('id, nombre')
        .eq('codigo_barras', code)
        .limit(1);
      const hit = data?.[0];
      if (hit && hit.id !== excludeId) {
        toast.warning(`Ese código ya está en «${hit.nombre}».`);
      }
    } catch {
      /* lookup best-effort: nunca bloquea el flujo */
    }
  }

  function handleScan(code: string) {
    setValue(code);
    setOpen(false);
    toast.success(`Código escaneado: ${code}`);
    void lookup(code);
    onScanned?.(code);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Código de barras (opcional)</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          placeholder="EAN / UPC"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Escanear con la cámara"
          className="flex shrink-0 items-center justify-center rounded-md border border-input px-3 text-muted-foreground shadow-xs hover:bg-muted"
        >
          <ScanLine className="size-4" />
        </button>
      </div>
      <BarcodeScannerModal open={open} onScan={handleScan} onClose={() => setOpen(false)} />
    </div>
  );
}
