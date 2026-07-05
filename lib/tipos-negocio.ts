/** Catálogo de tipos de negocio (perfil que ajusta el parser OCR y los defaults
 *  de catálogo). El value calza con el CHECK de configuracion_negocio y con
 *  TipoNegocio de lib/ocr/types.ts. */

import type { TipoNegocio } from '@/lib/ocr/types';

export const TIPOS_NEGOCIO: { value: TipoNegocio; label: string }[] = [
  { value: 'minimarket', label: 'Minimarket / almacén' },
  { value: 'restaurante', label: 'Restaurante / cafetería' },
  { value: 'ferreteria', label: 'Ferretería' },
  { value: 'farmacia', label: 'Farmacia' },
  { value: 'barberia', label: 'Barbería / peluquería' },
  { value: 'salud', label: 'Salud / kinesiología / consultas' },
  { value: 'dental', label: 'Clínica dental' },
  { value: 'estetica', label: 'Estética / spa / uñas' },
  { value: 'mascotas', label: 'Mascotas / peluquería canina / veterinaria' },
  { value: 'transporte', label: 'Transporte / taxi / fletes' },
  { value: 'educacion', label: 'Educación / clases / talleres' },
  { value: 'servicio_tecnico', label: 'Servicio técnico' },
  { value: 'construccion', label: 'Construcción / maestranza' },
  { value: 'arriendo', label: 'Arriendo de equipos o propiedades' },
  { value: 'profesional', label: 'Profesional independiente' },
  { value: 'otro', label: 'Otro' },
];

export function esTipoNegocio(v: string): v is TipoNegocio {
  return TIPOS_NEGOCIO.some((t) => t.value === v);
}

/** Una ficha del kit: producto o servicio de ejemplo, con precio c/IVA sugerido. */
export type FichaKit = {
  nombre: string;
  /** Precio de venta con IVA incluido (CLP). Omitido = solo categoría, sin ficha. */
  precio?: number;
  /** true = servicio (no controla stock). false/omitido = producto con stock. */
  servicio?: boolean;
};

/** Kit inicial por rubro: categorías + fichas de ejemplo listas para el POS.
 *  Los precios son referenciales (el dueño los edita). Los rubros de producto
 *  siembran solo categorías (los productos necesitan precio/stock reales). */
export type KitRubro = { categoria: string; fichas: FichaKit[] }[];

export const KIT_RUBRO: Partial<Record<TipoNegocio, KitRubro>> = {
  barberia: [
    {
      categoria: 'Servicios',
      fichas: [
        { nombre: 'Corte de pelo', precio: 8000, servicio: true },
        { nombre: 'Corte + barba', precio: 12000, servicio: true },
        { nombre: 'Perfilado de barba', precio: 6000, servicio: true },
        { nombre: 'Corte niño', precio: 6000, servicio: true },
      ],
    },
    { categoria: 'Productos', fichas: [] },
  ],
  salud: [
    {
      categoria: 'Prestaciones',
      fichas: [
        { nombre: 'Sesión de kinesiología', precio: 25000, servicio: true },
        { nombre: 'Evaluación inicial', precio: 30000, servicio: true },
        { nombre: 'Masaje descontracturante', precio: 22000, servicio: true },
      ],
    },
  ],
  dental: [
    {
      categoria: 'Prestaciones',
      fichas: [
        { nombre: 'Consulta dental', precio: 30000, servicio: true },
        { nombre: 'Limpieza dental', precio: 40000, servicio: true },
        { nombre: 'Tapadura / obturación', precio: 45000, servicio: true },
      ],
    },
  ],
  estetica: [
    {
      categoria: 'Servicios',
      fichas: [
        { nombre: 'Manicure', precio: 12000, servicio: true },
        { nombre: 'Pedicure', precio: 15000, servicio: true },
        { nombre: 'Depilación', precio: 18000, servicio: true },
        { nombre: 'Limpieza facial', precio: 25000, servicio: true },
      ],
    },
  ],
  mascotas: [
    {
      categoria: 'Servicios',
      fichas: [
        { nombre: 'Baño', precio: 12000, servicio: true },
        { nombre: 'Corte canino', precio: 18000, servicio: true },
        { nombre: 'Consulta veterinaria', precio: 20000, servicio: true },
      ],
    },
    { categoria: 'Productos', fichas: [] },
  ],
  transporte: [
    {
      categoria: 'Viajes',
      fichas: [
        { nombre: 'Carrera mínima', precio: 3000, servicio: true },
        { nombre: 'Traslado dentro de la ciudad', precio: 8000, servicio: true },
      ],
    },
  ],
  educacion: [
    {
      categoria: 'Clases',
      fichas: [
        { nombre: 'Clase individual', precio: 15000, servicio: true },
        { nombre: 'Clase grupal', precio: 8000, servicio: true },
      ],
    },
  ],
  servicio_tecnico: [
    {
      categoria: 'Servicios',
      fichas: [
        { nombre: 'Diagnóstico', precio: 10000, servicio: true },
        { nombre: 'Reparación básica', precio: 20000, servicio: true },
        { nombre: 'Mano de obra (hora)', precio: 15000, servicio: true },
      ],
    },
  ],
  profesional: [
    {
      categoria: 'Servicios',
      fichas: [
        { nombre: 'Hora de consultoría', precio: 30000, servicio: true },
        { nombre: 'Asesoría', precio: 50000, servicio: true },
      ],
    },
  ],
  construccion: [
    {
      categoria: 'Servicios',
      fichas: [
        { nombre: 'Día de mano de obra', precio: 45000, servicio: true },
        { nombre: 'Visita técnica', precio: 20000, servicio: true },
      ],
    },
  ],
  arriendo: [
    {
      categoria: 'Arriendos',
      fichas: [{ nombre: 'Arriendo por día', precio: 15000, servicio: true }],
    },
  ],
  // Rubros de producto: solo categorías (los productos requieren precio/stock reales).
  minimarket: [
    { categoria: 'Bebidas', fichas: [] },
    { categoria: 'Snacks', fichas: [] },
    { categoria: 'Abarrotes', fichas: [] },
    { categoria: 'Lácteos', fichas: [] },
  ],
  restaurante: [
    { categoria: 'Entradas', fichas: [] },
    { categoria: 'Fondos', fichas: [] },
    { categoria: 'Bebidas', fichas: [] },
    { categoria: 'Postres', fichas: [] },
  ],
  ferreteria: [
    { categoria: 'Herramientas', fichas: [] },
    { categoria: 'Fijaciones', fichas: [] },
    { categoria: 'Pinturas', fichas: [] },
    { categoria: 'Electricidad', fichas: [] },
  ],
  farmacia: [
    { categoria: 'Medicamentos', fichas: [] },
    { categoria: 'Cuidado personal', fichas: [] },
    { categoria: 'Bebés', fichas: [] },
  ],
};

/** ¿El rubro tiene kit de ejemplo para sembrar? */
export function tieneKit(v: string): v is TipoNegocio {
  return esTipoNegocio(v) && (KIT_RUBRO[v]?.length ?? 0) > 0;
}
