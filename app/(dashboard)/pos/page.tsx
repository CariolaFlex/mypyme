import { createClient } from '@/lib/supabase/server';
import { PosClient } from './pos-client';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const supabase = await createClient();

  const [{ data: productos }, { data: metodos }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, precio_total')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('metodos_pago')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre'),
  ]);

  return <PosClient productos={productos ?? []} metodos={metodos ?? []} />;
}
