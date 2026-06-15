-- ============================================================
-- mypyme — Fase 6 (Sprint 4): historial de pagos de suscripción
-- pagos_suscripcion: registro de cada cobro notificado por el webhook de Flow.
-- Lo escribe SOLO el webhook (service_role → bypassa RLS). Idempotente por flow_token.
-- RLS: lectura solo admin del tenant (la suscripción es zona de control admin).
-- ============================================================

CREATE TABLE public.pagos_suscripcion (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  flow_token           TEXT UNIQUE,           -- idempotencia del webhook
  flow_commerce_order  TEXT,
  flow_subscription_id TEXT,
  monto                INTEGER NOT NULL DEFAULT 0,
  flow_status          INTEGER,               -- status crudo de Flow (1..4)
  estado               TEXT NOT NULL,         -- estado interno (estadoDesdeFlow)
  pagado_en            TIMESTAMPTZ,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_susc_empresa ON public.pagos_suscripcion (empresa_id, creado_en DESC);

ALTER TABLE public.pagos_suscripcion ENABLE ROW LEVEL SECURITY;

-- Solo el admin del tenant LEE. Nadie escribe vía RLS (el webhook usa service_role).
CREATE POLICY pagosusc_select ON public.pagos_suscripcion
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_tenant_id() AND public.get_rol() = 'admin');

GRANT SELECT ON public.pagos_suscripcion TO authenticated;
