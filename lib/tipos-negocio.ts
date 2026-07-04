/** Catálogo de tipos de negocio (perfil que ajusta el parser OCR y, a futuro,
 *  defaults de inventario). El value calza con el CHECK de configuracion_negocio
 *  y con TipoNegocio de lib/ocr/types.ts. */

import type { TipoNegocio } from '@/lib/ocr/types';

export const TIPOS_NEGOCIO: { value: TipoNegocio; label: string }[] = [
  { value: 'minimarket', label: 'Minimarket / almacén' },
  { value: 'restaurante', label: 'Restaurante / cafetería' },
  { value: 'ferreteria', label: 'Ferretería' },
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'servicio_tecnico', label: 'Servicio técnico' },
  { value: 'construccion', label: 'Construcción / maestranza' },
  { value: 'arriendo', label: 'Arriendo de equipos o propiedades' },
  { value: 'profesional', label: 'Profesional independiente' },
  { value: 'otro', label: 'Otro' },
];

export function esTipoNegocio(v: string): v is TipoNegocio {
  return TIPOS_NEGOCIO.some((t) => t.value === v);
}
