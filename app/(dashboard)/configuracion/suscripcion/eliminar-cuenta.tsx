'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { eliminarCuenta } from './actions';

export function EliminarCuenta({ razonSocial }: { razonSocial: string }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const habilitado = texto.trim() === 'ELIMINAR';

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setAbierto(true)}>
        Eliminar cuenta
      </Button>

      <Modal open={abierto} onClose={() => setAbierto(false)} title="Eliminar cuenta">
        <form action={eliminarCuenta} className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Vas a eliminar <strong className="text-foreground">{razonSocial}</strong> de forma
              permanente: productos, ventas, caja, inventario, compras, gastos, reportes y todas las
              cuentas de usuario de esta empresa.
            </p>
            <p className="font-medium text-destructive">
              Esta acción no se puede deshacer. Si tienes una suscripción activa, se cancelará.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmar" className="text-sm">
              Escribe <strong>ELIMINAR</strong> para confirmar
            </label>
            <Input
              id="confirmar"
              name="confirmar"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              placeholder="ELIMINAR"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={!habilitado}>
              Eliminar definitivamente
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
