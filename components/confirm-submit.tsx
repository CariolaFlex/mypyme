'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type Size = 'default' | 'sm' | 'lg' | 'icon';

/**
 * Botón que confirma antes de enviar el <form> que lo contiene. Debe usarse
 * DENTRO de un <form action={serverAction}>: al confirmar, hace requestSubmit()
 * del form padre (dispara la server action). El botón de confirmación es del
 * tipo submit y vive dentro del mismo form (el Modal se renderiza inline).
 */
export function ConfirmSubmit({
  message,
  title = '¿Confirmar?',
  confirmLabel = 'Confirmar',
  children,
  variant = 'ghost',
  size = 'sm',
  className,
}: {
  message: React.ReactNode;
  title?: string;
  confirmLabel?: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{message}</div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" size="sm">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
