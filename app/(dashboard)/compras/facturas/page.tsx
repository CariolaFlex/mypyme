import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { clp, fmtFecha } from '@/lib/reportes';
import { ESTADO_FACT, estadoFactVariante } from './estado';

export const dynamic = 'force-dynamic';

type FactRow = {
  id: string;
  numero_factura: string;
  fecha: string;
  vencimiento: string | null;
  monto_total: number;
  saldo: number;
  estado: string;
  proveedores: { nombre: string } | null;
};

export default async function FacturasPage() {
  const supabase = await createClient();
  const { data: facturas } = await supabase
    .from('facturas_proveedor')
    .select('id, numero_factura, fecha, vencimiento, monto_total, saldo, estado, proveedores(nombre)')
    .order('creado_en', { ascending: false })
    .limit(50);

  const rows = (facturas as unknown as FactRow[] | null) ?? [];
  const totalPorPagar = rows
    .filter((f) => f.estado !== 'cancelada')
    .reduce((s, f) => s + Number(f.saldo), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cuentas por pagar</h1>
          <p className="text-sm text-muted-foreground">
            Facturas de proveedores. Por pagar: <span className="font-semibold text-foreground">{clp.format(totalPorPagar)}</span>
          </p>
        </div>
        <Link href="/compras/facturas/nueva">
          <Button>Nueva factura</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Factura</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Vence</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.numero_factura}</TableCell>
                <TableCell>{f.proveedores?.nombre ?? '—'}</TableCell>
                <TableCell>{fmtFecha(f.vencimiento)}</TableCell>
                <TableCell>
                  <Badge variant={estadoFactVariante(f.estado)}>{ESTADO_FACT[f.estado] ?? f.estado}</Badge>
                </TableCell>
                <TableCell className="text-right">{clp.format(Number(f.monto_total))}</TableCell>
                <TableCell className="text-right">{clp.format(Number(f.saldo))}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/compras/facturas/${f.id}`} className="text-sm underline-offset-2 hover:underline">
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                Aún no hay facturas de proveedor.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
