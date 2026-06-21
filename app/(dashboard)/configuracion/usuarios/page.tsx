import { createClient } from '@/lib/supabase/server';
import { crearEmpleado, cambiarRol, quitarUsuario } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { fmtFecha } from '@/lib/reportes';

export const dynamic = 'force-dynamic';

type Miembro = { usuario_id: string; email: string; rol: string; creado_en: string };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as Record<string, unknown> | undefined;
  const yoId = claims?.sub as string | undefined;
  const esAdmin = claims?.user_rol === 'admin';

  const { data: miembros } = await supabase.rpc('listar_usuarios_empresa');
  const lista = (miembros as Miembro[] | null) ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Quién tiene acceso a tu negocio. Los <strong>admin</strong> gestionan todo; los{' '}
          <strong>empleados</strong> operan el POS y la caja.
        </p>
      </div>

      {ok && (
        <p className="rounded-md border border-emerald-600/30 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700">
          {ok}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Alta de usuario (solo admin) */}
      {esAdmin && (
        <form action={crearEmpleado} className="space-y-3 rounded-md border p-4">
          <div className="text-sm font-medium">Agregar usuario</div>
          <p className="text-xs text-muted-foreground">
            Sin envío de correo: defines una clave temporal y se la entregas a la persona. Podrá
            cambiarla luego. Si el email ya tiene cuenta, se vincula a tu negocio (la clave se ignora).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="empleado@cafe.cl" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Clave temporal</Label>
              <Input id="password" name="password" type="text" required minLength={8} placeholder="mín. 8 caracteres" />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="rol">Rol</Label>
              <select
                id="rol"
                name="rol"
                className="block rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-2 text-sm shadow-xs"
                defaultValue="empleado"
              >
                <option value="empleado">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      )}

      {/* Lista de miembros */}
      <div className="divide-y rounded-md border">
        {lista.length ? (
          lista.map((m) => {
            const soyYo = m.usuario_id === yoId;
            return (
              <div key={m.usuario_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {m.email}
                    {soyYo && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">Desde {fmtFecha(m.creado_en)}</div>
                </div>

                {esAdmin && !soyYo ? (
                  <div className="flex items-center gap-2">
                    <form action={cambiarRol} className="flex items-center gap-1">
                      <input type="hidden" name="usuario_id" value={m.usuario_id} />
                      <select
                        name="rol"
                        defaultValue={m.rol}
                        className="rounded-md border border-input bg-input/50 backdrop-blur-sm px-2 py-1.5 text-sm shadow-xs"
                      >
                        <option value="empleado">Empleado</option>
                        <option value="admin">Administrador</option>
                      </select>
                      <Button type="submit" variant="outline" size="sm">Guardar</Button>
                    </form>
                    <form action={quitarUsuario}>
                      <input type="hidden" name="usuario_id" value={m.usuario_id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        Quitar
                      </Button>
                    </form>
                  </div>
                ) : (
                  <Badge variant={m.rol === 'admin' ? 'default' : 'secondary'}>
                    {m.rol === 'admin' ? 'Administrador' : 'Empleado'}
                  </Badge>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Sin usuarios.</div>
        )}
      </div>
    </div>
  );
}
