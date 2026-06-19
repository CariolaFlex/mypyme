// Glosario único de términos de Gestionala (auditoría UX/UI §9). Fuente de verdad
// compartida por la pestaña Glosario del Centro de ayuda y por los tooltips inline
// (<Termino slug="...">). Lenguaje simple para dueños no técnicos.

export type TerminoGlosario = {
  slug: string;
  termino: string;
  definicion: string;
  ejemplo: string;
  categoria: 'Impuestos' | 'Inventario' | 'Ventas y caja' | 'Plataforma';
};

export const GLOSARIO: TerminoGlosario[] = [
  // ── Impuestos y tributación ──────────────────────────────────────────────
  {
    slug: 'iva',
    termino: 'IVA',
    definicion: 'Impuesto al Valor Agregado. En Chile es 19% sobre el precio neto. Lo cobras al vender y lo pagas al comprar.',
    ejemplo: 'Vendes un café a $1.000 neto → cobras $1.190 ($190 son IVA).',
    categoria: 'Impuestos',
  },
  {
    slug: 'iva_debito',
    termino: 'IVA débito',
    definicion: 'El IVA que cobras a tus clientes al vender. Se declara y paga al SII cada mes.',
    ejemplo: 'Vendiste $100.000 + IVA este mes → tu IVA débito es $19.000.',
    categoria: 'Impuestos',
  },
  {
    slug: 'iva_credito',
    termino: 'IVA crédito',
    definicion: 'El IVA que pagas a tus proveedores al comprar. Se descuenta del IVA débito al declarar.',
    ejemplo: 'Compraste insumos por $50.000 + IVA → tu IVA crédito es $9.500.',
    categoria: 'Impuestos',
  },
  {
    slug: 'iva_a_pagar',
    termino: 'IVA a pagar',
    definicion: 'La diferencia entre tu IVA débito y tu IVA crédito. Es lo que efectivamente pagas al SII.',
    ejemplo: 'Débito $19.000 − crédito $9.500 = pagas $9.500.',
    categoria: 'Impuestos',
  },
  {
    slug: 'credito_fiscal',
    termino: 'Crédito fiscal',
    definicion: 'Otro nombre del IVA crédito: el monto de IVA que puedes descontar de lo que debes pagar. Solo las facturas lo generan.',
    ejemplo: 'Tienes $9.500 de crédito fiscal este mes.',
    categoria: 'Impuestos',
  },
  {
    slug: 'neto',
    termino: 'Neto',
    definicion: 'El monto sin IVA. Es la base sobre la que se calcula el impuesto.',
    ejemplo: 'Precio $1.190 con IVA → el neto es $1.000.',
    categoria: 'Impuestos',
  },
  {
    slug: 'bruto',
    termino: 'Bruto',
    definicion: 'El monto total con IVA incluido. Es lo que paga el cliente.',
    ejemplo: 'Neto $1.000 + IVA $190 = bruto $1.190.',
    categoria: 'Impuestos',
  },
  {
    slug: 'f29',
    termino: 'F29',
    definicion: 'El Formulario 29 del SII: la declaración mensual de IVA. Se presenta antes del día 12 del mes siguiente.',
    ejemplo: 'Vendes en junio → declaras el F29 antes del 12 de julio.',
    categoria: 'Impuestos',
  },
  {
    slug: 'sii',
    termino: 'SII',
    definicion: 'Servicio de Impuestos Internos: el organismo que recauda los impuestos en Chile.',
    ejemplo: 'Declaras tus ventas al SII cada mes con el F29.',
    categoria: 'Impuestos',
  },
  {
    slug: 'boleta',
    termino: 'Boleta',
    definicion: 'Comprobante de venta simple. No da derecho a crédito fiscal a quien la recibe.',
    ejemplo: 'Compras un café para consumo → te dan una boleta.',
    categoria: 'Impuestos',
  },
  {
    slug: 'factura',
    termino: 'Factura',
    definicion: 'Comprobante formal que sí da derecho a crédito fiscal IVA a quien la recibe.',
    ejemplo: 'Compras insumos para tu negocio → pides factura para usar el crédito.',
    categoria: 'Impuestos',
  },
  {
    slug: 'exento',
    termino: 'Exento',
    definicion: 'Producto o servicio sin IVA (tasa 0%). Una factura o boleta exenta no lleva impuesto.',
    ejemplo: 'Un curso de capacitación puede ir con factura exenta, sin IVA.',
    categoria: 'Impuestos',
  },
  {
    slug: 'rut',
    termino: 'RUT',
    definicion: 'Rol Único Tributario: el identificador fiscal de empresas y personas en Chile.',
    ejemplo: 'Tu empresa tiene RUT 76.543.210-1.',
    categoria: 'Impuestos',
  },
  {
    slug: 'giro',
    termino: 'Giro',
    definicion: 'La actividad económica principal de tu negocio, declarada al SII.',
    ejemplo: 'Giro: «Venta al por menor de alimentos».',
    categoria: 'Impuestos',
  },

  // ── Inventario y stock ───────────────────────────────────────────────────
  {
    slug: 'sku',
    termino: 'SKU',
    definicion: 'Código único que identifica cada producto en tu inventario (sus siglas en inglés: Stock Keeping Unit).',
    ejemplo: 'Café molido 250g = SKU «CAF-250».',
    categoria: 'Inventario',
  },
  {
    slug: 'stock',
    termino: 'Stock',
    definicion: 'La cantidad disponible de un producto en tu inventario.',
    ejemplo: 'Tienes 15 unidades de café en stock.',
    categoria: 'Inventario',
  },
  {
    slug: 'stock_minimo',
    termino: 'Stock mínimo',
    definicion: 'La cantidad mínima que quieres mantener. Si el stock baja de ahí, te avisamos.',
    ejemplo: 'Stock mínimo del café = 5 unidades.',
    categoria: 'Inventario',
  },
  {
    slug: 'stock_bajo',
    termino: 'Stock bajo',
    definicion: 'Cuando el stock actual queda en o bajo el mínimo. Aparece con un aviso ámbar.',
    ejemplo: 'Te quedan 3 cafés (mínimo 5) → stock bajo.',
    categoria: 'Inventario',
  },
  {
    slug: 'merma',
    termino: 'Merma',
    definicion: 'Pérdida de producto por rotura, vencimiento o robo. Se registra como una salida de inventario.',
    ejemplo: 'Se quebró una botella → registras una merma de 1 unidad.',
    categoria: 'Inventario',
  },
  {
    slug: 'movimiento',
    termino: 'Movimiento',
    definicion: 'Cualquier entrada o salida de stock. El stock se calcula sumando todos los movimientos.',
    ejemplo: 'Compraste 10 (entrada) y vendiste 3 (salida) → stock 7.',
    categoria: 'Inventario',
  },
  {
    slug: 'entrada',
    termino: 'Entrada',
    definicion: 'Movimiento que aumenta el stock (una compra a proveedor, una devolución).',
    ejemplo: 'Llegaron 20 panes → registras una entrada de 20.',
    categoria: 'Inventario',
  },
  {
    slug: 'ajuste',
    termino: 'Ajuste',
    definicion: 'Movimiento para corregir el stock y que coincida con lo que cuentas físicamente.',
    ejemplo: 'El sistema dice 10 pero contaste 8 → registras un ajuste de −2.',
    categoria: 'Inventario',
  },
  {
    slug: 'ticket_promedio',
    termino: 'Ticket promedio',
    definicion: 'El promedio de venta por transacción: total vendido dividido por la cantidad de ventas.',
    ejemplo: 'Vendiste $100.000 en 50 ventas → ticket promedio $2.000.',
    categoria: 'Inventario',
  },

  // ── Ventas y caja ────────────────────────────────────────────────────────
  {
    slug: 'pos',
    termino: 'POS / Punto de venta',
    definicion: 'La pantalla donde registras las ventas y cobras a tus clientes.',
    ejemplo: 'Atiendes a un cliente y cobras en el POS.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'caja',
    termino: 'Caja',
    definicion: 'La sesión donde controlas el efectivo del día. Se abre al empezar y se cierra al terminar.',
    ejemplo: 'Abres la caja con $20.000 y la cierras al final del día.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'monto_apertura',
    termino: 'Monto de apertura',
    definicion: 'El efectivo con el que abres la caja. Sirve para tener cambio.',
    ejemplo: 'Abres con $20.000 en billetes y monedas chicas.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'cuadratura',
    termino: 'Cuadratura',
    definicion: 'Verificar que el efectivo que cuentas en la caja coincide con lo que calcula el sistema. Si hay diferencia, queda registrada.',
    ejemplo: 'El sistema dice $50.000 y contaste $50.000 → cuadratura perfecta.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'esperado',
    termino: 'Efectivo esperado',
    definicion: 'Cuánto efectivo debería haber en la caja según el sistema: la apertura más las ventas en efectivo y los movimientos.',
    ejemplo: 'Abriste con $20.000 y vendiste $30.000 en efectivo → esperado $50.000.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'diferencia',
    termino: 'Diferencia',
    definicion: 'La discrepancia entre lo que el sistema esperaba y lo que cuentas de verdad al cerrar.',
    ejemplo: 'Esperado $50.000, contaste $49.500 → diferencia −$500.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'contado',
    termino: 'Contado',
    definicion: 'Pago inmediato: el cliente paga al recibir el producto.',
    ejemplo: 'Vendes un café y te pagan al instante → al contado.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'saldo',
    termino: 'Saldo',
    definicion: 'El monto que queda por pagar o por cobrar.',
    ejemplo: 'Una factura de $100.000 con $60.000 ya pagados → saldo $40.000.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'vence',
    termino: 'Vencimiento',
    definicion: 'La fecha límite para pagar una factura o deuda.',
    ejemplo: 'Factura del 01/06 a 30 días → vence el 01/07.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'orden_compra',
    termino: 'Orden de compra (OC)',
    definicion: 'Un documento que le envías a un proveedor para pedir productos a un precio acordado. No es un comprobante de pago.',
    ejemplo: 'OC #001: 20 kg de café a $15.000 el kilo.',
    categoria: 'Ventas y caja',
  },
  {
    slug: 'operacion',
    termino: 'Operación',
    definicion: 'Cualquier transacción que registras: una venta, una compra, un gasto o un movimiento.',
    ejemplo: 'Una venta de $2.000 es una operación.',
    categoria: 'Ventas y caja',
  },

  // ── Plataforma y cuenta ──────────────────────────────────────────────────
  {
    slug: 'trial',
    termino: 'Período de prueba (trial)',
    definicion: 'Los días gratis para usar Gestionala sin pagar. No se cobra nada durante el trial.',
    ejemplo: 'Tu prueba termina en 12 días.',
    categoria: 'Plataforma',
  },
  {
    slug: 'rol',
    termino: 'Rol',
    definicion: 'El tipo de permiso de un usuario: administrador (acceso total) o empleado (operación del día a día).',
    ejemplo: 'María tiene rol Empleado: vende y registra, pero no entra a Configuración.',
    categoria: 'Plataforma',
  },
  {
    slug: 'bitacora',
    termino: 'Bitácora',
    definicion: 'El registro de todos los cambios hechos en tu cuenta. Útil para auditar quién hizo qué y cuándo.',
    ejemplo: 'La bitácora muestra que Juan creó un proveedor ayer.',
    categoria: 'Plataforma',
  },
  {
    slug: 'clave_temporal',
    termino: 'Clave temporal',
    definicion: 'La contraseña inicial de un usuario nuevo. La entregas tú en persona y conviene que la cambie al entrar.',
    ejemplo: 'Creas a juan@correo.cl con una clave temporal que le pasas directo.',
    categoria: 'Plataforma',
  },
];

export const GLOSARIO_MAP: Record<string, TerminoGlosario> = Object.fromEntries(
  GLOSARIO.map((t) => [t.slug, t])
);

export const GLOSARIO_CATEGORIAS: TerminoGlosario['categoria'][] = [
  'Impuestos',
  'Inventario',
  'Ventas y caja',
  'Plataforma',
];
