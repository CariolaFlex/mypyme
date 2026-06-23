import { CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mpConfigurado } from '@/lib/mp/config';
import { listarDevices, type MpDevice } from '@/lib/mp/client';
import { conectarMP, vincularDevice, desconectarMP } from './actions';

export const dynamic = 'force-dynamic';

export default async function MercadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const configurado = mpConfigurado();
  // Link de afiliado/referido de MP (para negocios sin maquinita). Gateado: el
  // botón solo aparece cuando Andrés pone su URL de partner en el env.
  const afiliadoUrl = process.env.MP_AFFILIATE_URL ?? null;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const empresaId = (claims?.claims as Record<string, unknown> | undefined)?.empresa_id as
    | string
    | undefined;

  const { data: conx } = await supabase
    .from('mp_conexiones')
    .select('mp_user_id, estado, expira_en')
    .maybeSingle();
  const conectada = conx?.estado === 'conectada';

  const { data: device } = await supabase
    .from('mp_dispositivos')
    .select('device_id, modo')
    .eq('estado', 'activo')
    .maybeSingle();

  // Si está conectada pero sin terminal vinculada, ofrecemos elegir una.
  let devices: MpDevice[] = [];
  let devicesError: string | null = null;
  if (configurado && conectada && empresaId && !device) {
    try {
      devices = await listarDevices(empresaId);
    } catch (e) {
      devicesError = (e as Error).message;
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <PageHeader
        icon={CreditCard}
        title="Mercado Pago Point"
        description="Cobra con tarjeta desde el POS usando tu maquinita Point."
        help={
          <>
            <p>Conecta tu cuenta de Mercado Pago y vincula tu terminal Point Smart.</p>
            <p>Al cobrar en el POS podrás elegir «Mercado Pago»: el monto se envía a la maquinita y la venta queda registrada al aprobarse el pago.</p>
            <p>El cobro con tarjeta <strong>requiere internet</strong>. El efectivo sigue funcionando sin conexión.</p>
          </>
        }
      />

      {ok && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
          {ok}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!configurado && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          La integración con Mercado Pago aún no está habilitada en esta instalación. Se activará cuando
          se configuren las credenciales.
        </div>
      )}

      {configurado && (
        <>
          {/* Paso 1: conexión */}
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-medium">1. Conexión</h2>
            {conectada ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Conectado{conx?.mp_user_id ? ` · cuenta ${conx.mp_user_id}` : ''}.
                </p>
                <form action={desconectarMP}>
                  <Button type="submit" variant="outline" size="sm">
                    Desconectar
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <form action={conectarMP}>
                  <Button type="submit">Conectar Mercado Pago</Button>
                </form>
                {afiliadoUrl && (
                  <p className="text-sm text-muted-foreground">
                    ¿No tienes maquinita?{' '}
                    <a
                      href={afiliadoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Consigue tu Mercado Pago Point
                    </a>
                    .
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Paso 2: terminal */}
          {conectada && (
            <section className="space-y-3 rounded-lg border bg-card p-4">
              <h2 className="font-medium">2. Terminal Point</h2>
              {device ? (
                <p className="text-sm text-muted-foreground">
                  Terminal vinculada: <strong>{device.device_id}</strong>
                  {device.modo ? ` · ${device.modo}` : ''}.
                </p>
              ) : (
                <div className="space-y-3">
                  {devicesError && (
                    <p className="text-sm text-destructive">
                      No se pudieron listar las terminales: {devicesError}. Ingresa el ID manualmente.
                    </p>
                  )}
                  {devices.length > 0 && (
                    <form action={vincularDevice} className="space-y-2">
                      <select
                        name="device_id"
                        className="w-full rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.id}
                            {d.modo ? ` · ${d.modo}` : ''}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm">
                        Vincular terminal
                      </Button>
                    </form>
                  )}
                  <form action={vincularDevice} className="flex gap-2">
                    <Input name="device_id" placeholder="ID de la terminal (manual)" />
                    <Button type="submit" variant="outline" size="sm">
                      Vincular
                    </Button>
                  </form>
                  <p className="text-xs text-muted-foreground">
                    La terminal debe estar en modo PDV (integrado) y vinculada a tu cuenta en la app de
                    Mercado Pago.
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
