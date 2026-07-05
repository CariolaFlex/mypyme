'use client';

// Tarjeta de "Ventas por día" con selector de tipo de gráfico (barras/línea/área).
// La preferencia se guarda por usuario en localStorage. Vive en el cliente para
// poder cambiar la variante sin recargar; el server pasa los datos por props.
import { useEffect, useState } from 'react';
import { BarChart3, LineChart, AreaChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VentasPorDiaChart } from '@/components/charts/dynamic';
import type { VarianteChart } from '@/components/charts/sales-charts';

const KEY = 'gestionala:chart-ventas-variante';
const OPCIONES: { v: VarianteChart; label: string; icon: typeof BarChart3 }[] = [
  { v: 'barras', label: 'Barras', icon: BarChart3 },
  { v: 'linea', label: 'Línea', icon: LineChart },
  { v: 'area', label: 'Área', icon: AreaChart },
];

export function VentasChartCard({
  data,
  titulo = 'Ventas — últimos 7 días',
}: {
  data: { dia: string; num_ventas: number; total: number }[];
  titulo?: string;
}) {
  const [variante, setVariante] = useState<VarianteChart>('barras');

  // Restaurar la preferencia guardada (localStorage = sistema externo; no se puede
  // leer en el render SSR sin desajustar la hidratación, por eso va en un effect).
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as VarianteChart | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v && OPCIONES.some((o) => o.v === v)) setVariante(v);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  const elegir = (v: VarianteChart) => {
    setVariante(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{titulo}</CardTitle>
        <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
          {OPCIONES.map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => elegir(v)}
              aria-label={label}
              title={label}
              className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                variante === v
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <VentasPorDiaChart data={data} variante={variante} />
      </CardContent>
    </Card>
  );
}
