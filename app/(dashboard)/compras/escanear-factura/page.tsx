import Link from 'next/link';
import { ScanText, History } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { EscanearFactura } from './escanear-factura';

export const dynamic = 'force-dynamic';

export default async function EscanearFacturaPage() {
  const supabase = await createClient();
  const { data: proveedores } = await supabase
    .from('proveedores')
    .select('id, nombre, rut')
    .eq('activo', true)
    .order('nombre');

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={ScanText}
        title="Escanear factura"
        description="Saca una foto de la factura del proveedor y regístrala en Cuentas por pagar."
        help={
          <>
            <p>El <strong>OCR corre en tu teléfono</strong> y extrae proveedor, RUT, fecha, total e ítems.</p>
            <p>Es una <strong>ayuda</strong>: siempre revisa y corrige antes de registrar. En facturas con tablas complejas los ítems pueden no salir — registra el total igual.</p>
          </>
        }
      />
      <Link
        href="/compras/escanear-factura/historial"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <History className="size-4" /> Ver historial de escaneos
      </Link>
      <EscanearFactura proveedores={proveedores ?? []} />
    </div>
  );
}
