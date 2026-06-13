import { createClient } from '@/lib/supabase/server';
import { PosClient } from './pos-client';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const supabase = await createClient();

  const [{ data: productos }, { data: metodos }, { data: sesion }] = await Promise.all([
    supabase.from('productos').select('id, nombre, precio_total').eq('activo', true).order('nombre'),
    supabase.from('metodos_pago').select('id, nombre, tipo').eq('activo', true).order('nombre'),
    supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle(),
  ]);

  return (
    <PosClient
      productos={productos ?? []}
      metodos={metodos ?? []}
      sesionCajaId={sesion?.id ?? null}
    />
  );
}
