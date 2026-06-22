import Link from 'next/link';
import { History } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { fmtFecha } from '@/lib/reportes';
import type { FacturaExtraida } from '@/lib/ocr/types';
import { BorrarScan } from './borrar-scan';

export const dynamic = 'force-dynamic';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

const ESTADO: Record<string, { label: string; cls: string }> = {
  borrador: { label: 'Borrador', cls: 'bg-muted text-muted-foreground' },
  revisado: { label: 'Revisado', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  importado: { label: 'Importado', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
};

export default async function HistorialScansPage() {
  const supabase = await createClient();
  const { data: scans } = await supabase
    .from('ocr_scans')
    .select('id, datos, estado, factura_id, creado_en')
    .order('creado_en', { ascending: false });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={History}
        title="Historial de escaneos"
        description="Facturas escaneadas y su estado."
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans?.length ? (
            scans.map((s) => {
              const d = (s.datos ?? {}) as Partial<FacturaExtraida>;
              const est = ESTADO[s.estado] ?? ESTADO.borrador;
              return (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{fmtFecha(s.creado_en?.slice(0, 10) ?? '')}</TableCell>
                  <TableCell>{d.razonSocial || '—'}</TableCell>
                  <TableCell className="text-right">{clp.format(d.total ?? 0)}</TableCell>
                  <TableCell>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${est.cls}`}>{est.label}</span>
                    {s.factura_id && (
                      <Link href={`/compras/facturas/${s.factura_id}`} className="ml-2 text-xs underline">
                        ver factura
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.estado !== 'importado' && (
                      <Link
                        href={`/compras/escanear-factura?scan=${s.id}`}
                        className="mr-3 text-xs underline-offset-2 hover:underline"
                      >
                        Reabrir
                      </Link>
                    )}
                    <BorrarScan scanId={s.id} />
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5}>
                <EmptyState
                  icon={History}
                  title="Sin escaneos todavía"
                  description="Escanea una factura para verla aquí."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
