import Link from 'next/link';
import { Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { clp, MESES } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type FilaDebito = { mes: number; iva_debito: number };
type FilaCredito = { mes: number; iva_credito: number };

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
  const [{ data: debitoData }, { data: creditoData }] = await Promise.all([
    supabase.rpc('reporte_iva_mensual', { p_anio: anio }),
    supabase.rpc('reporte_iva_credito_mensual', { p_anio: anio }),
  ]);

  const debitoPorMes = new Map(
    ((debitoData as FilaDebito[] | null) ?? []).map((f) => [f.mes, Number(f.iva_debito)])
  );
  const creditoPorMes = new Map(
    ((creditoData as FilaCredito[] | null) ?? []).map((f) => [f.mes, Number(f.iva_credito)])
  );

  let totDebito = 0;
  let totCredito = 0;
  for (const v of debitoPorMes.values()) totDebito += v;
  for (const v of creditoPorMes.values()) totCredito += v;
  const totResultado = totDebito - totCredito;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reporte de IVA (F29)</h1>
          <p className="text-sm text-muted-foreground">
            IVA débito (ventas) menos crédito (gastos) por mes. Insumo para el Formulario 29.
          </p>
        </div>
        <a
          href={`/reportes/iva/export?anio=${anio}`}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Download className="size-4" />
          Exportar CSV
        </a>
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
                <TableHead className="text-right">IVA débito</TableHead>
                <TableHead className="text-right">IVA crédito</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MESES.map((nombre, i) => {
                const debito = debitoPorMes.get(i + 1) ?? 0;
                const credito = creditoPorMes.get(i + 1) ?? 0;
                const resultado = debito - credito;
                const vacio = debito === 0 && credito === 0;
                return (
                  <TableRow key={nombre} className={vacio ? 'text-muted-foreground' : undefined}>
                    <TableCell>{nombre}</TableCell>
                    <TableCell className="text-right">{clp.format(debito)}</TableCell>
                    <TableCell className="text-right">{clp.format(credito)}</TableCell>
                    <TableCell className={cn('text-right', !vacio && resultado < 0 && 'text-green-600')}>
                      {clp.format(resultado)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-semibold">
                <TableCell>Total {anio}</TableCell>
                <TableCell className="text-right">{clp.format(totDebito)}</TableCell>
                <TableCell className="text-right">{clp.format(totCredito)}</TableCell>
                <TableCell className={cn('text-right', totResultado < 0 && 'text-green-600')}>
                  {clp.format(totResultado)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">
            <strong>Resultado</strong> = débito − crédito. Positivo: IVA a pagar en el período.
            Negativo (verde): remanente de crédito fiscal a favor para el mes siguiente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
