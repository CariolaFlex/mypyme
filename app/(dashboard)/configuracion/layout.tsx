import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Toda la zona de Configuración es solo-admin. Un empleado que navegue
// directo a /configuracion/* es redirigido (la RLS ya protege los datos;
// esto evita además mostrarle formularios que no le corresponden).
export default async function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const rol = (data?.claims as Record<string, unknown> | undefined)?.user_rol;
  if (rol !== 'admin') redirect('/inicio');
  return <>{children}</>;
}
