import Dexie, { type Table } from 'dexie';

/** Payload de una venta lista para enviar al RPC process_sale. */
export type VentaPayload = {
  ventaId: string;
  sesionCajaId: string | null;
  lineas: { producto_id: string; cantidad: number }[];
  pagos: { metodo_pago_id: string; monto: number; monto_recibido?: number }[];
};

/** Venta encolada localmente mientras no hay conexión. */
export interface VentaPendiente {
  ventaId: string; // PK (mismo UUID que se manda al backend → idempotencia)
  payload: VentaPayload;
  total: number;
  creadoEn: number;
}

/** Producto cacheado para que el catálogo del POS funcione offline. */
export interface ProductoCache {
  id: string;
  nombre: string;
  precio_total: number | null;
  categoria_id: string | null;
  codigo_barras: string | null; // para escanear → carrito (lookup offline en memoria)
  granel: boolean; // true = se vende por peso/medida (cantidad decimal, precio por unidad)
  unidad_medida: string | null; // ej. 'kg' (rótulo en el modal de granel)
}

class MyPymeDB extends Dexie {
  ventasPendientes!: Table<VentaPendiente, string>;
  productos!: Table<ProductoCache, string>;

  constructor() {
    super('mypyme');
    this.version(1).stores({
      ventasPendientes: 'ventaId, creadoEn',
      productos: 'id',
    });
  }
}

// Dexie solo existe en el navegador; los archivos que lo importan son "use client".
export const db = new MyPymeDB();
