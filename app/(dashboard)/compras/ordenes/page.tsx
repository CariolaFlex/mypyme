import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, fmtFecha } from '@/lib/reportes';
import { ESTADO_OC, estadoVariante } from './estado';

export const dynamic = 'force-dynamic';

type OcRow = {
  id: string;
  fecha: string;
  estado: string;
  monto_total: number;
  proveedores: { nombre: string } | null;
};

export default async function OrdenesPage() {
  const supabase = await createClient();
  const { data: ordenes } = await supabase
    .from('ordenes_compra')
    .select('id, fecha, estado, monto_total, proveedores(nombre)')
    .order('creado_en', { ascending: false })
    .limit(50);

  const rows = (ordenes as unknown as OcRow[] | null) ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader icon={ClipboardList} title="Órdenes de compra" description="Pedidos a proveedores y su recepción.">
        <Link href="/compras/ordenes/nueva">
          <Button>Nueva orden</Button>
        </Link>
      </PageHeader>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{fmtFecha(o.fecha)}</TableCell>
                <TableCell className="font-medium">{o.proveedores?.nombre ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={estadoVariante(o.estado)}>{ESTADO_OC[o.estado] ?? o.estado}</Badge>
                </TableCell>
                <TableCell className="text-right">{clp.format(Number(o.monto_total))}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/compras/ordenes/${o.id}`} className="text-sm underline-offset-2 hover:underline">
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                Aún no hay órdenes de compra.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
