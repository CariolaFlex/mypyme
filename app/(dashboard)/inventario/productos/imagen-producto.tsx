'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

/**
 * Campo de imagen de producto que sube DIRECTO a Storage desde el navegador.
 *
 * Motivo: subir la foto por la server action chocaba con el límite de body de
 * Server Actions de Next (1MB por defecto) → las fotos de celular (2–5MB) tiraban
 * un "server error" y se perdía el formulario. Subiéndola client-side (con
 * downscale previo) el archivo nunca pasa por la action: el form solo manda la
 * URL pública en un input oculto. El bucket `productos` ya tiene RLS por
 * carpeta = empresa_id.
 */

const MAX_DIM = 1200; // lado mayor tras el downscale

async function downscaleToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no-canvas');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('no-blob'))),
      'image/jpeg',
      0.85
    );
  });
}

export function ImagenProducto({ name = 'imagen_url' }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('El archivo no es una imagen.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: claims } = await supabase.auth.getClaims();
      const empresaId = (claims?.claims as Record<string, unknown> | undefined)?.empresa_id as
        | string
        | undefined;
      if (!empresaId) throw new Error('sin-empresa');

      const blob = await downscaleToJpeg(file);
      const path = `${empresaId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('productos')
        .upload(path, blob, { contentType: 'image/jpeg' });
      if (error) throw error;

      const publicUrl = supabase.storage.from('productos').getPublicUrl(path).data.publicUrl;
      setUrl(publicUrl);
      toast.success('Imagen lista.');
    } catch {
      toast.error('No se pudo subir la imagen. Puedes guardar el producto sin ella.');
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setUrl('');
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="imagen-file">Imagen (opcional)</Label>
      {/* La URL ya subida viaja al server action; nunca el archivo. */}
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Vista previa" className="size-12 rounded object-cover" />
        ) : (
          <div className="flex size-12 items-center justify-center rounded bg-muted text-muted-foreground">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </div>
        )}

        <input
          ref={inputRef}
          id="imagen-file"
          type="file"
          accept="image/*"
          disabled={busy}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />

        {url && (
          <button
            type="button"
            onClick={clear}
            aria-label="Quitar imagen"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
