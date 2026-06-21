import { ScanLine } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { EscaneoRapido } from './escaneo-rapido';

export const dynamic = 'force-dynamic';

export default function EscaneoRapidoPage() {
  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        icon={ScanLine}
        title="Escaneo rápido"
        description="Recorre tu bodega: escanea, pon precio y cantidad, guarda y sigue."
        help={
          <>
            <p>Pensado para <strong>cargar muchos productos rápido</strong> con el celular.</p>
            <p>Escanea el código → completa nombre, precio y cantidad → «Guardar y escanear siguiente». Si el producto ya existe, te avisa para que ajustes su stock desde Inventario.</p>
          </>
        }
      />
      <EscaneoRapido />
    </div>
  );
}
