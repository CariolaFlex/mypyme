-- Cuentas de cortesía: acceso gratis sin pasar por Flow (testing propio, regalos,
-- promos puntuales). Si acceso_cortesia_hasta >= hoy, la empresa tiene acceso aunque
-- el cobro (FLOW_ENFORCE) esté encendido y no tenga suscripción activa.
-- NULL = sin cortesía. Para "gratis para siempre", usar una fecha lejana (2099-12-31).
-- Se setea por SQL/dashboard o un futuro panel admin (no por el tenant).

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS acceso_cortesia_hasta DATE;

COMMENT ON COLUMN public.empresas.acceso_cortesia_hasta IS
  'Acceso de cortesía hasta esta fecha (inclusive). NULL = sin cortesía. Lejana = vitalicia.';
