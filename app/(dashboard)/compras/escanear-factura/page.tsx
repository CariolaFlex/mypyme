import Link from 'next/link';
import { ScanText, History, PencilLine } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { EscanearFactura } from './escanear-factura';

export const dynamic = 'force-dynamic';

export default async function EscanearFacturaPage() {
  const supabase = await createClient();
  const [{ data: proveedores }, { data: productos }, { data: cfg }] = await Promise.all([
    supabase.from('proveedores').select('id, nombre, rut').eq('activo', true).order('nombre'),
    supabase.from('productos').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('configuracion_negocio').select('usa_iva, tasa_iva_default').maybeSingle(),
  ]);
  const tasaDefault = cfg?.usa_iva ? Number(cfg.tasa_iva_default ?? 19) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        icon={ScanText}
        title="Ingresar compra"
        description="Saca una foto de la factura/boleta del proveedor y regístrala en Cuentas por pagar."
        help={
          <>
            <p>El <strong>OCR corre en tu teléfono</strong> y extrae proveedor, RUT, fecha, total e ítems.</p>
            <p>Es una <strong>ayuda</strong>: siempre revisa y corrige antes de registrar. En facturas con tablas complejas los ítems pueden no salir — registra el total igual.</p>
            <p>¿Sin foto a mano? Usa <strong>«Ingresar a mano»</strong> para cargar la factura escribiendo los datos.</p>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link
          href="/compras/facturas/nueva"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <PencilLine className="size-4" /> Ingresar a mano (sin foto)
        </Link>
        <Link
          href="/compras/escanear-factura/historial"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <History className="size-4" /> Ver historial de escaneos
        </Link>
      </div>
      <EscanearFactura proveedores={proveedores ?? []} productos={productos ?? []} tasaDefault={tasaDefault} />
    </div>
  );
}
