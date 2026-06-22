import { createClient } from '@/lib/supabase/server';
import { PosClient } from './pos-client';

export const dynamic = 'force-dynamic';

export default async function PosPage() {
  const supabase = await createClient();

  const [
    { data: productos },
    { data: metodos },
    { data: categorias },
    { data: sesion },
    { data: empresa },
    { data: config },
  ] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, precio_total, categoria_id, codigo_barras, granel, unidad_medida')
      .eq('activo', true)
      .order('nombre'),
    supabase.from('metodos_pago').select('id, nombre, tipo').eq('activo', true).order('nombre'),
    supabase.from('categorias_producto').select('id, nombre').order('nombre'),
    supabase.from('sesiones_caja').select('id').eq('estado', 'abierta').maybeSingle(),
    supabase.from('empresas').select('rut, razon_social, giro, telefono, direccion').single(),
    supabase.from('configuracion_negocio').select('usa_iva, tasa_iva_default').maybeSingle(),
  ]);

  const negocio = {
    razonSocial: empresa?.razon_social ?? 'Mi negocio',
    rut: empresa?.rut ?? '',
    giro: empresa?.giro ?? null,
    direccion: empresa?.direccion ?? null,
    telefono: empresa?.telefono ?? null,
    usaIva: config?.usa_iva ?? true,
    tasaIva: Number(config?.tasa_iva_default ?? 19),
  };

  return (
    <PosClient
      productos={productos ?? []}
      metodos={metodos ?? []}
      categorias={categorias ?? []}
      sesionCajaId={sesion?.id ?? null}
      negocio={negocio}
    />
  );
}
