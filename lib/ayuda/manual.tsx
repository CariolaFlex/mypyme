/**
 * Manual del centro de ayuda: una entrada por módulo de la plataforma.
 * Fuente única que consumen el hub (`/ayuda`) y las páginas de detalle
 * (`/ayuda/[slug]`). Contenido en lenguaje simple para dueños no técnicos.
 */
import {
  ShoppingCart, Wallet, Boxes, Package, ScanLine, Truck, TrendingDown,
  BarChart3, Users, Sparkles, type LucideIcon,
} from 'lucide-react';

export type Modulo = {
  slug: string;
  titulo: string;
  resumen: string; // para la tarjeta del hub
  icono: LucideIcon;
  abrirEn?: { href: string; label: string }; // ir al módulo real en la app
  intro: React.ReactNode;
  pasos: { titulo: string; detalle: React.ReactNode }[];
  tips?: { tipo: 'tip' | 'aviso' | 'info'; texto: React.ReactNode }[];
  faqs?: { q: string; a: React.ReactNode }[];
  glosario?: string[]; // slugs de lib/glosario.ts relacionados
};

export const MODULOS: Modulo[] = [
  {
    slug: 'productos',
    titulo: 'Productos y catálogo',
    resumen: 'Crea tu catálogo: precios, categorías, códigos e imágenes.',
    icono: Package,
    abrirEn: { href: '/inventario/productos', label: 'Ir a Productos' },
    intro: (
      <>
        Tu catálogo es la base de todo: lo que vendes en el POS y lo que controlas en el inventario.
        Puedes cargarlo uno por uno o importar muchos de una vez.
      </>
    ),
    pasos: [
      { titulo: 'Crea un producto', detalle: <>En <strong>Productos → Agregar</strong> pon nombre, precio y categoría. El <strong>precio se ingresa con IVA incluido</strong>; el sistema calcula el neto solo.</> },
      { titulo: 'Agrega el código de barras', detalle: <>Escríbelo o usa el botón <strong>escáner</strong> con la cámara. Si el producto está en la base mundial, se autocompletan nombre e imagen.</> },
      { titulo: 'Define unidad y contenido', detalle: <>Elige la unidad (unidad, kg, L…) y el contenido (ej. 1,5 L). Marca <strong>«Se vende a granel»</strong> si cobras por peso.</> },
      { titulo: 'Importa en masa (opcional)', detalle: <>En <strong>Importar catálogo</strong> pega tus productos como «Nombre; Precio; Categoría; Stock» o sube un CSV. Crea las categorías que falten solo.</> },
    ],
    tips: [
      { tipo: 'tip', texto: <>¿Te equivocaste al escanear? Usa <strong>«Empezar de cero»</strong> para limpiar el formulario y probar con otro producto.</> },
      { tipo: 'info', texto: <>El stock inicial es opcional: si lo pones, registramos una entrada de inventario automáticamente.</> },
    ],
    faqs: [
      { q: '¿El precio se ingresa con o sin IVA?', a: <><strong>Con IVA incluido.</strong> Calculamos el neto y el IVA según la tasa de tu negocio.</> },
      { q: '¿Cómo cargo muchos productos de golpe?', a: <>Usa <strong>Importar catálogo</strong> (pegar texto o subir CSV).</> },
    ],
    glosario: ['sku', 'neto', 'bruto', 'iva', 'exento', 'stock_minimo'],
  },
  {
    slug: 'inventario',
    titulo: 'Inventario y stock',
    resumen: 'Controla el stock: entradas, mermas, ajustes y alertas.',
    icono: Boxes,
    abrirEn: { href: '/inventario/stock', label: 'Ir a Inventario' },
    intro: (
      <>
        El inventario calcula el stock <strong>solo</strong>: las ventas lo bajan y las compras lo suben.
        Tú solo registras los movimientos manuales cuando hace falta.
      </>
    ),
    pasos: [
      { titulo: 'Mira el stock actual', detalle: <>La tabla muestra cuántas unidades tienes de cada producto, calculadas a partir de todos sus movimientos.</> },
      { titulo: 'Registra entradas y salidas', detalle: <>Usa <strong>Entrada</strong> (llegó mercadería), <strong>Merma</strong> (rotura/vencimiento) o <strong>Ajuste ±</strong> (corregir contra lo que cuentas físicamente).</> },
      { titulo: 'Atiende las alertas', detalle: <>El badge ámbar <strong>«stock bajo»</strong> aparece cuando un producto cae bajo su stock mínimo. Es tu recordatorio de reponer.</> },
    ],
    tips: [
      { tipo: 'tip', texto: <>Configura un <strong>stock mínimo</strong> en cada producto para recibir alertas antes de quedarte sin nada.</> },
    ],
    glosario: ['stock', 'stock_minimo', 'stock_bajo', 'merma', 'movimiento', 'entrada', 'ajuste'],
  },
  {
    slug: 'pos',
    titulo: 'Punto de venta (POS)',
    resumen: 'Cobra rápido, divide pagos y vende incluso sin internet.',
    icono: ShoppingCart,
    abrirEn: { href: '/pos', label: 'Ir al Punto de venta' },
    intro: (
      <>
        El POS es donde atiendes y cobras. Es táctil, rápido y <strong>funciona sin internet</strong>:
        si se cae la conexión, sigues vendiendo y todo se sincroniza solo al volver.
      </>
    ),
    pasos: [
      { titulo: 'Abre la caja primero', detalle: <>Necesitas una caja abierta para cobrar. Si el botón Cobrar está deshabilitado, abre tu caja.</> },
      { titulo: 'Arma el carrito', detalle: <>Toca los productos, búscalos por nombre o filtra por categoría. También puedes <strong>escanear</strong> el código de barras con la cámara.</> },
      { titulo: 'Vende a granel', detalle: <>Para productos por peso, ingresa los kilos o el monto («$1.000 de queso») y calculamos el resto.</> },
      { titulo: 'Cobra', detalle: <>Elige el método de pago. Puedes <strong>dividir el pago</strong> en varios. Si es efectivo, ingresa lo recibido y te mostramos el <strong>vuelto</strong>.</> },
      { titulo: 'Imprime el comprobante', detalle: <>Tras cobrar puedes imprimir un comprobante térmico. Es interno: no es una boleta del SII.</> },
    ],
    tips: [
      { tipo: 'aviso', texto: <>El comprobante del POS <strong>no es un documento tributario</strong>. La emisión de boletas/facturas ante el SII es responsabilidad tuya.</> },
      { tipo: 'tip', texto: <>¿Sin señal? Vende igual. Verás «Sin conexión» y un contador de ventas «por sincronizar» que se vacía al reconectar.</> },
    ],
    faqs: [
      { q: '¿Por qué no puedo cobrar?', a: <>Probablemente no tienes una caja abierta. Ve a <strong>Caja</strong> y ábrela.</> },
      { q: '¿Puedo vender sin internet?', a: <>Sí. Las ventas se guardan en el dispositivo y se sincronizan al volver la conexión.</> },
    ],
    glosario: ['pos', 'contado', 'caja', 'iva'],
  },
  {
    slug: 'caja',
    titulo: 'Caja y cuadratura',
    resumen: 'Abre y cierra caja con arqueo automático del efectivo.',
    icono: Wallet,
    abrirEn: { href: '/caja', label: 'Ir a Caja' },
    intro: (
      <>
        La caja controla el efectivo del día. Abres declarando con cuánto partes y cierras contando lo
        que hay: el sistema te dice si <strong>cuadra</strong> o hay diferencia.
      </>
    ),
    pasos: [
      { titulo: 'Abre la caja', detalle: <>Declara el <strong>monto de apertura</strong> (el efectivo con el que empiezas, para dar vuelto).</> },
      { titulo: 'Opera el día', detalle: <>Las ventas en efectivo suman al esperado. Puedes registrar <strong>entradas y salidas</strong> manuales (ej. sacar plata para una compra).</> },
      { titulo: 'Cierra y cuadra', detalle: <>Al cerrar, cuenta el efectivo físico. Comparamos con lo <strong>esperado</strong> y mostramos la <strong>diferencia</strong>, que queda registrada.</> },
    ],
    tips: [
      { tipo: 'info', texto: <>Solo el <strong>efectivo</strong> entra a la cuadratura. Los pagos con tarjeta o transferencia no afectan el conteo de caja.</> },
    ],
    glosario: ['caja', 'monto_apertura', 'cuadratura', 'esperado', 'diferencia'],
  },
  {
    slug: 'escaner-ocr',
    titulo: 'Escáner y escaneo de facturas',
    resumen: 'Cámara para códigos de barras y OCR de facturas de proveedor.',
    icono: ScanLine,
    abrirEn: { href: '/compras/escanear-factura', label: 'Ir a Ingresar compra' },
    intro: (
      <>
        Dos herramientas para ahorrar tipeo: el <strong>escáner de códigos</strong> (para productos y POS)
        y el <strong>escaneo de facturas</strong> que lee una foto y arma la cuenta por pagar.
      </>
    ),
    pasos: [
      { titulo: 'Escanea códigos de barras', detalle: <>En el alta de producto, en «Escaneo rápido» y en el POS hay un botón de cámara para leer el EAN/UPC. Hay modo continuo para varios seguidos.</> },
      { titulo: 'Saca la foto de la factura', detalle: <>En <strong>Ingresar compra</strong>, elige el tipo de documento, ilumina bien y encuadra. Lee mejor si se ven RUT, N° y TOTAL.</> },
      { titulo: 'Revisa lo detectado', detalle: <>Te mostramos proveedor, montos e ítems para que los <strong>corrijas</strong>. Hay validación de cuadre (neto + IVA = total) en vivo.</> },
      { titulo: 'Registra la compra', detalle: <>Vincula o crea el proveedor y guarda en <strong>Cuentas por pagar</strong>. Opcionalmente carga los ítems al inventario.</> },
    ],
    tips: [
      { tipo: 'aviso', texto: <>El lector es una ayuda <strong>en mejora continua</strong>: puede equivocarse, sobre todo en fotos borrosas o documentos timbrados. <strong>Revisa siempre</strong> antes de guardar.</> },
      { tipo: 'tip', texto: <>¿No alcanzaste a terminar? Guarda un <strong>borrador</strong> y reábrelo después desde el historial.</> },
    ],
    glosario: ['factura', 'rut', 'credito_fiscal', 'sku'],
  },
  {
    slug: 'compras',
    titulo: 'Compras y proveedores',
    resumen: 'Proveedores, órdenes de compra y cuentas por pagar.',
    icono: Truck,
    abrirEn: { href: '/compras/facturas', label: 'Ir a Compras' },
    intro: (
      <>
        Lleva el control de lo que le compras a tus proveedores: desde la orden hasta el pago,
        con el inventario y el IVA crédito actualizándose solos.
      </>
    ),
    pasos: [
      { titulo: 'Registra proveedores', detalle: <>Crea cada proveedor una vez (con su vendedor/contacto opcional) para reutilizarlo.</> },
      { titulo: 'Crea una orden de compra (opcional)', detalle: <>Pide mercadería a un precio acordado, apruébala y registra la <strong>recepción</strong>: el stock se suma solo.</> },
      { titulo: 'Lleva las cuentas por pagar', detalle: <>Registra la factura del proveedor y sus <strong>pagos</strong> (totales o parciales). Si pagas en efectivo, se descuenta de la caja.</> },
    ],
    tips: [
      { tipo: 'tip', texto: <>El camino más rápido es <strong>Ingresar compra</strong> con foto: resuelve proveedor, factura e inventario de una.</> },
    ],
    glosario: ['orden_compra', 'factura', 'saldo', 'vence', 'credito_fiscal'],
  },
  {
    slug: 'gastos',
    titulo: 'Gastos',
    resumen: 'Anota egresos y suma su IVA al crédito fiscal.',
    icono: TrendingDown,
    abrirEn: { href: '/gastos', label: 'Ir a Gastos' },
    intro: <>Registra todo lo que sale del negocio (arriendo, servicios, sueldos, insumos) para tener tus números claros y aprovechar el IVA crédito.</>,
    pasos: [
      { titulo: 'Anota el gasto', detalle: <>Elige categoría, proveedor (opcional), el monto con IVA y la fecha. Indica el tipo de documento (factura, boleta…).</> },
      { titulo: 'Págalo de la caja (opcional)', detalle: <>Si marcas pago en efectivo con la caja abierta, el monto se <strong>descuenta de la caja</strong> automáticamente.</> },
      { titulo: 'Aprovecha el IVA', detalle: <>El IVA de los gastos con <strong>factura</strong> suma a tu crédito fiscal en el F29.</> },
    ],
    tips: [
      { tipo: 'info', texto: <>Solo las <strong>facturas</strong> dan crédito fiscal. Boletas y documentos exentos no descuentan IVA.</> },
    ],
    glosario: ['credito_fiscal', 'iva_credito', 'factura', 'exento'],
  },
  {
    slug: 'reportes-iva',
    titulo: 'Reportes e IVA (F29)',
    resumen: 'Ventas por día/método/producto y tu IVA listo para el F29.',
    icono: BarChart3,
    abrirEn: { href: '/reportes/iva', label: 'Ir a Reportes' },
    intro: <>Mira cómo va tu negocio y ten el IVA del mes calculado como insumo para tu declaración F29.</>,
    pasos: [
      { titulo: 'Revisa tus ventas', detalle: <>Filtra por período y mira el total, el ticket promedio y el detalle por día, método de pago, producto y cajero.</> },
      { titulo: 'Calcula tu IVA', detalle: <>El reporte <strong>IVA (F29)</strong> muestra el débito (IVA de ventas) menos el crédito (IVA de gastos con factura) por mes.</> },
      { titulo: 'Exporta a Excel', detalle: <>Usa el botón <strong>«Exportar»</strong> para descargar un CSV compatible con Excel chileno.</> },
    ],
    tips: [
      { tipo: 'aviso', texto: <>El F29 que mostramos es un <strong>insumo</strong> para tu declaración: revísalo con tu contador antes de presentarlo al SII.</> },
    ],
    glosario: ['f29', 'iva_debito', 'iva_credito', 'iva_a_pagar', 'ticket_promedio', 'sii'],
  },
  {
    slug: 'usuarios',
    titulo: 'Usuarios y roles',
    resumen: 'Suma a tu equipo con permisos de admin o empleado.',
    icono: Users,
    abrirEn: { href: '/configuracion/usuarios', label: 'Ir a Usuarios' },
    intro: <>Agrega a tu equipo y dale a cada persona el permiso justo. Todo cambio queda en la bitácora.</>,
    pasos: [
      { titulo: 'Crea la cuenta', detalle: <>El admin crea cada usuario con una <strong>clave temporal</strong> que le entrega en persona (o vincula una cuenta existente).</> },
      { titulo: 'Asigna el rol', detalle: <><strong>Administrador</strong>: acceso total (configuración, usuarios, suscripción). <strong>Empleado</strong>: opera el día a día (vender, inventario, compras), sin configuración.</> },
      { titulo: 'Audita con la bitácora', detalle: <>Revisa quién hizo qué y cuándo en la <strong>Bitácora de cambios</strong>.</> },
    ],
    glosario: ['rol', 'bitacora', 'clave_temporal'],
  },
  {
    slug: 'suscripcion',
    titulo: 'Planes y suscripción',
    resumen: 'Tu prueba gratis, los planes y cómo se cobra.',
    icono: Sparkles,
    abrirEn: { href: '/configuracion/suscripcion', label: 'Ir a Suscripción' },
    intro: <>Empiezas con una prueba gratis y luego eliges un plan mensual. Sin comisión por venta y cancelas cuando quieras.</>,
    pasos: [
      { titulo: 'Usa tu prueba gratis', detalle: <>Durante el <strong>período de prueba</strong> no se cobra nada. Tienes la plataforma completa para evaluarla.</> },
      { titulo: 'Elige tu plan', detalle: <><strong>Emprende</strong> para vender y ordenar tu negocio; <strong>Pyme</strong> si necesitas equipo, roles y trazabilidad.</> },
      { titulo: 'Inscribe tu tarjeta', detalle: <>Para continuar, registras una tarjeta en <strong>Configuración → Suscripción</strong>. El cobro es mensual vía Flow; ves tu historial ahí mismo.</> },
    ],
    tips: [
      { tipo: 'tip', texto: <>Puedes <strong>cancelar cuando quieras</strong>: la cancelación aplica al final del período ya pagado y conservas tus datos.</> },
    ],
    glosario: ['trial'],
  },
];

export const MODULOS_MAP: Record<string, Modulo> = Object.fromEntries(MODULOS.map((m) => [m.slug, m]));
