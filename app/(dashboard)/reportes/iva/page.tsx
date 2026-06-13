import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { clp, MESES } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type FilaIva = { mes: number; neto: number; iva_debito: number; num_ventas: number };

export default async function ReporteIvaPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioRaw } = await searchParams;
  const anioActual = new Date().getFullYear();
  const anio = Number.isInteger(Number(anioRaw)) ? Number(anioRaw) : anioActual;
  const anios = [anioActual, anioActual - 1, anioActual - 2];

  const supabase = await createClient();
  const { data } = await supabase.rpc('reporte_iva_mensual', { p_anio: anio });
  const filas = (data as FilaIva[] | null) ?? [];
  const porMes = new Map(filas.map((f) => [f.mes, f]));

  const totNeto = filas.reduce((s, f) => s + Number(f.neto), 0);
  const totIva = filas.reduce((s, f) => s + Number(f.iva_debito), 0);
  const totVentas = filas.reduce((s, f) => s + Number(f.num_ventas), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporte de IVA (F29)</h1>
        <p className="text-sm text-muted-foreground">
          IVA débito mensual a partir de las ventas. Insumo para el Formulario 29.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {anios.map((a) => (
          <Link
            key={a}
            href={`/reportes/iva?anio=${a}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              a === anio ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
            )}
          >
            {a}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Año {anio}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">IVA débito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MESES.map((nombre, i) => {
                const f = porMes.get(i + 1);
                const vacio = !f;
                return (
                  <TableRow key={nombre} className={vacio ? 'text-muted-foreground' : undefined}>
                    <TableCell>{nombre}</TableCell>
                    <TableCell className="text-right">{Number(f?.num_ventas ?? 0)}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(f?.neto ?? 0))}</TableCell>
                    <TableCell className="text-right">{clp.format(Number(f?.iva_debito ?? 0))}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-semibold">
                <TableCell>Total {anio}</TableCell>
                <TableCell className="text-right">{totVentas}</TableCell>
                <TableCell className="text-right">{clp.format(totNeto)}</TableCell>
                <TableCell className="text-right">{clp.format(totIva)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            El crédito fiscal (IVA de compras y gastos) se incorporará con la Fase 4. Por ahora este
            reporte cubre solo el débito fiscal generado por las ventas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
