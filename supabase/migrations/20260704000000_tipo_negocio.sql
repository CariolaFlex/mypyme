-- Perfil de negocio: qué tipo de comercio es la empresa. Lo declara el usuario
-- (onboarding o Configuración → Negocio) y se inyecta como contexto al motor
-- OCR/parser de documentos (unidades relevantes, IVA, conceptos de servicio).
-- NULL = no declarado (el parser usa el comportamiento genérico).
-- Las políticas/grants existentes de public.configuracion_negocio ya cubren
-- esta columna.

ALTER TABLE public.configuracion_negocio
  ADD COLUMN IF NOT EXISTS tipo_negocio VARCHAR(30)
  CHECK (tipo_negocio IS NULL OR tipo_negocio IN (
    'minimarket', 'restaurante', 'ferreteria', 'farmacia',
    'servicio_tecnico', 'construccion', 'arriendo', 'profesional', 'otro'
  ));
