import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // RLS filtra por empresa del JWT → solo devuelve la empresa del usuario.
  const { data: empresa } = await supabase
    .from('empresas')
    .select('razon_social, rut, plan, estado_suscripcion')
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{empresa?.razon_social ?? 'Tu negocio'}</h1>
        <p className="text-sm text-gray-500">
          RUT {empresa?.rut} · Plan {empresa?.plan} · {empresa?.estado_suscripcion}
        </p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
        Aquí irá el resumen del día (ventas, caja, stock bajo).
        <br />
        Por ahora: cuenta creada y multi-tenant operativo. 🎉
      </div>
    </div>
  );
}
