import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/app-sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const empresaId = claims?.empresa_id;
  if (!empresaId) {
    redirect('/onboarding');
  }
  const esAdmin = claims?.user_rol === 'admin';

  const [{ data: empresa }, { data: productos }, { data: stockRows }] = await Promise.all([
    supabase.from('empresas').select('razon_social').single(),
    supabase.from('productos').select('id, stock_minimo').eq('activo', true),
    supabase.from('vw_stock_actual').select('producto_id, stock'),
  ]);

  const stockPorProducto = new Map<string, number>();
  for (const r of stockRows ?? []) {
    stockPorProducto.set(r.producto_id, (stockPorProducto.get(r.producto_id) ?? 0) + Number(r.stock));
  }
  const stockBajo = (productos ?? []).filter(
    (p) => p.stock_minimo != null && (stockPorProducto.get(p.id) ?? 0) <= Number(p.stock_minimo)
  ).length;

  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <AppSidebar empresaNombre={empresa?.razon_social ?? 'Tu negocio'} stockBajo={stockBajo} esAdmin={esAdmin} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl animate-in fade-in-50 slide-in-from-bottom-1 p-6 duration-300 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
