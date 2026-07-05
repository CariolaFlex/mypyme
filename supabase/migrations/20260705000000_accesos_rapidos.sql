-- ============================================================
-- mypyme — Accesos rápidos personalizables del dashboard
--
-- Botones de acceso directo que CADA usuario arma a su gusto (icono, color,
-- etiqueta, destino y orden). Se muestran en el Dashboard. Son POR USUARIO
-- dentro de la empresa: el dueño y cada empleado tienen los suyos.
--
-- destino: ruta interna ('/pos', '/deudas') o URL externa (https://…). La
-- app valida el formato antes de guardar; el render nunca ejecuta nada, solo
-- navega. Dato 100% operativo del propio usuario → RLS por usuario_id.
-- ============================================================

CREATE TABLE public.accesos_rapidos (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  etiqueta    VARCHAR(40) NOT NULL,
  icono       VARCHAR(30) NOT NULL DEFAULT 'Zap',
  destino     TEXT NOT NULL,
  color       VARCHAR(20) NOT NULL DEFAULT 'blue',
  orden       INTEGER NOT NULL DEFAULT 0,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accesos_usuario ON public.accesos_rapidos (empresa_id, usuario_id, orden);

ALTER TABLE public.accesos_rapidos ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve y gestiona SOLO sus propios accesos, dentro de su empresa.
CREATE POLICY accesos_propios ON public.accesos_rapidos
  FOR ALL TO authenticated
  USING (empresa_id = public.get_tenant_id() AND usuario_id = auth.uid())
  WITH CHECK (empresa_id = public.get_tenant_id() AND usuario_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accesos_rapidos TO authenticated;
