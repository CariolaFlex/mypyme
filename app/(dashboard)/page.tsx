import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from('empresas')
    .select('razon_social, rut, plan, estado_suscripcion')
    .single();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{empresa?.razon_social ?? 'Tu negocio'}</h1>
          <p className="text-sm text-muted-foreground">RUT {empresa?.rut}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Plan {empresa?.plan}</Badge>
          <Badge>{empresa?.estado_suscripcion}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen del día</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Aquí irá el resumen del día (ventas, caja, stock bajo) cuando el POS esté activo.
          <br />
          Por ahora: cuenta creada y multi-tenant operativo. 🎉
        </CardContent>
      </Card>
    </div>
  );
}
