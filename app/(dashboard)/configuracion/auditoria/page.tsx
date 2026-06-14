import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

type Registro = {
  id: number;
  tabla: string;
  registro_id: string | null;
  accion: 'insert' | 'update' | 'delete';
  actor_email: string | null;
  datos_antes: Record<string, unknown> | null;
  datos_despues: Record<string, unknown> | null;
  ocurrido_en: string;
};

const TABLA: Record<string, string> = {
  empresas: 'Negocio',
  configuracion_negocio: 'Configuración',
  usuarios_empresa: 'Equipo',
  productos: 'Producto',
  categorias_producto: 'Categoría',
  bodegas: 'Bodega',
  metodos_pago: 'Método de pago',
  proveedores: 'Proveedor',
  categorias_gasto: 'Categoría de gasto',
  gastos: 'Gasto',
  ordenes_compra: 'Orden de compra',
  ordenes_compra_lineas: 'Línea de orden',
  facturas_proveedor: 'Factura de proveedor',
};

const ACCION: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  insert: { label: 'creó', variant: 'default' },
  update: { label: 'editó', variant: 'secondary' },
  delete: { label: 'eliminó', variant: 'destructive' },
};

const IGNORAR = new Set(['id', 'empresa_id', 'creado_en', 'actualizado_en', 'ocurrido_en']);

const fechaHora = (s: string) =>
  new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(s));

const val = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  return String(v);
};

function cambios(antes: Record<string, unknown> | null, despues: Record<string, unknown> | null) {
  if (!antes || !despues) return [];
  return Object.keys(despues)
    .filter((k) => !IGNORAR.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
    .map((k) => ({ campo: k, antes: antes[k], despues: despues[k] }));
}

function nombreDe(r: Registro) {
  const d = r.datos_despues ?? r.datos_antes ?? {};
  return (d.nombre as string) || (d.razon_social as string) || (d.numero_factura as string) || (r.registro_id ?? '').slice(0, 8);
}

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('auditoria')
    .select('id, tabla, registro_id, accion, actor_email, datos_antes, datos_despues, ocurrido_en')
    .order('ocurrido_en', { ascending: false })
    .limit(150);

  const registros = (data as Registro[] | null) ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bitácora de cambios</h1>
        <p className="text-sm text-muted-foreground">
          Cada cambio en tus datos queda registrado: quién, qué y cuándo. Así nada se pierde y
          puedes rastrear cualquier modificación.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {registros.length ? (
            <ul className="divide-y">
              {registros.map((r) => {
                const acc = ACCION[r.accion];
                const difs = r.accion === 'update' ? cambios(r.datos_antes, r.datos_despues) : [];
                return (
                  <li key={r.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant={acc.variant} className="capitalize">{acc.label}</Badge>
                      <span className="text-muted-foreground">{TABLA[r.tabla] ?? r.tabla}</span>
                      <span className="font-medium">{nombreDe(r)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{fechaHora(r.ocurrido_en)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      por {r.actor_email ?? 'sistema'}
                    </div>
                    {difs.length > 0 && (
                      <div className="mt-2 space-y-0.5 rounded-md bg-muted/50 px-3 py-2 text-xs">
                        {difs.map((d) => (
                          <div key={d.campo} className="flex flex-wrap gap-1">
                            <span className="font-medium text-foreground">{d.campo}:</span>
                            <span className="text-destructive/80 line-through">{val(d.antes)}</span>
                            <span>→</span>
                            <span className="text-emerald-700">{val(d.despues)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Aún no hay cambios registrados.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
