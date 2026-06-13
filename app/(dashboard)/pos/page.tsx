import { createClient } from '@/lib/supabase/server';
import { PosClient } from './pos-client';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const supabase = await createClient();

  const [{ data: productos }, { data: metodos }, { data: categorias }, { data: sesion }] =
    await Promise.all([
      supabase
        .from('productos')
        .select('id, nombre, precio_total, categoria_id')
        .eq('activo', true)
        .order('nombre'),
      supabase.from('metodos_pago').select('id, nombre, tipo').eq('activo', true).order('nombre'),
      supabase.from('categorias_producto').select('id, nombre').order('nombre'),
      supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle(),
    ]);

  return (
    <PosClient
      productos={productos ?? []}
      metodos={metodos ?? []}
      categorias={categorias ?? []}
      sesionCajaId={sesion?.id ?? null}
    />
  );
}
