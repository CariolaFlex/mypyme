import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BookOpen, Rocket, Package, ShoppingCart, Wallet, Truck, TrendingDown,
  BarChart3, Users, Sparkles, LifeBuoy, ChevronDown,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: 'Centro de ayuda',
  description: 'Guía de uso y preguntas frecuentes de Gestionala.',
};

type Guia = { icon: typeof Rocket; titulo: string; pasos: React.ReactNode[] };

const GUIAS: Guia[] = [
  {
    icon: Rocket,
    titulo: 'Primeros pasos',
    pasos: [
      <>Completa los datos de tu negocio en <strong>Configuración → Negocio</strong> (razón social, RUT, IVA).</>,
      <>Carga tu catálogo en <strong>Productos</strong> (uno por uno) o usa <strong>Importar catálogo</strong> para pegar muchos de una vez.</>,
      <>Abre tu <strong>Caja</strong> con el monto inicial y empieza a cobrar en el <strong>Punto de venta</strong>.</>,
    ],
  },
  {
    icon: Package,
    titulo: 'Productos e inventario',
    pasos: [
      <>El <strong>precio se ingresa con IVA incluido</strong>; el sistema calcula el neto.</>,
      <>Agrupa productos en <strong>Categorías</strong> para encontrarlos rápido y ver reportes.</>,
      <>El <strong>Inventario</strong> calcula el stock solo: las ventas lo bajan, las compras lo suben. Puedes registrar entradas, mermas o ajustes manuales.</>,
      <>El badge ámbar avisa qué productos están por agotarse (bajo su stock mínimo).</>,
    ],
  },
  {
    icon: ShoppingCart,
    titulo: 'Punto de venta (POS)',
    pasos: [
      <>Toca los productos para agregarlos al carrito; busca por nombre o filtra por categoría.</>,
      <>Elige el método de pago y cobra. Puedes <strong>dividir el pago</strong> en varios métodos.</>,
      <>Si pagan en efectivo, ingresa el monto recibido y el sistema calcula el <strong>vuelto</strong>.</>,
      <>Funciona <strong>sin internet</strong>: las ventas se guardan y se sincronizan solas al volver la conexión.</>,
      <>Tras cobrar puedes imprimir un comprobante (es interno, no es boleta del SII).</>,
    ],
  },
  {
    icon: Wallet,
    titulo: 'Caja',
    pasos: [
      <><strong>Abre la caja</strong> declarando con cuánto efectivo partes. Necesitas una caja abierta para cobrar.</>,
      <>Puedes registrar entradas y salidas de efectivo manuales durante el día.</>,
      <>Al <strong>cerrar</strong>, cuentas el efectivo físico y el sistema te muestra la diferencia (cuadratura).</>,
    ],
  },
  {
    icon: Truck,
    titulo: 'Compras y proveedores',
    pasos: [
      <>Registra a tus <strong>Proveedores</strong> una vez para reutilizarlos.</>,
      <>Crea una <strong>Orden de compra</strong>, apruébala y registra la recepción cuando llegue la mercadería: el stock se suma solo.</>,
      <>En <strong>Cuentas por pagar</strong> registras las facturas de proveedores y sus pagos (totales o parciales).</>,
    ],
  },
  {
    icon: TrendingDown,
    titulo: 'Gastos',
    pasos: [
      <>Anota cada egreso (arriendo, servicios, sueldos, insumos…).</>,
      <>Si pagas en efectivo con la caja abierta, el monto se descuenta de la caja.</>,
      <>El IVA de los gastos suma a tu <strong>crédito fiscal</strong> en el F29.</>,
    ],
  },
  {
    icon: BarChart3,
    titulo: 'Reportes e IVA',
    pasos: [
      <>Mira tus ventas por día, método de pago, producto y cajero.</>,
      <>El reporte de <strong>IVA (F29)</strong> calcula el débito (ventas) menos el crédito (gastos) por mes.</>,
      <>Puedes <strong>exportar a Excel</strong> (CSV) con el botón «Exportar».</>,
    ],
  },
  {
    icon: Users,
    titulo: 'Usuarios y roles',
    pasos: [
      <>El <strong>administrador</strong> ve todo y administra la configuración, usuarios y suscripción.</>,
      <>El <strong>empleado</strong> puede operar (vender, inventario, compras, gastos) pero no entra a la zona de configuración.</>,
      <>Todo cambio en los datos queda registrado en la <strong>Bitácora</strong>.</>,
    ],
  },
  {
    icon: Sparkles,
    titulo: 'Suscripción',
    pasos: [
      <>Empiezas con un período de prueba gratis (no se cobra nada durante el trial).</>,
      <>Para seguir usando el servicio, inscribes una tarjeta en <strong>Configuración → Suscripción</strong>.</>,
      <>El cobro es mensual vía Flow; puedes ver tu historial de pagos ahí mismo.</>,
    ],
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: '¿Puedo vender sin internet?',
    a: <>Sí. El Punto de venta funciona offline: las ventas se guardan en tu dispositivo y se sincronizan automáticamente cuando vuelve la conexión.</>,
  },
  {
    q: '¿Por qué necesito abrir la caja antes de vender?',
    a: <>Para poder cuadrar el efectivo. Al abrir declaras con cuánto partes; al cerrar, el sistema compara lo esperado con lo que cuentas físicamente y detecta diferencias.</>,
  },
  {
    q: '¿El precio se ingresa con o sin IVA?',
    a: <><strong>Con IVA incluido.</strong> El sistema calcula el neto y el IVA automáticamente a partir del precio que pones y de la tasa configurada en tu negocio.</>,
  },
  {
    q: '¿Cómo cargo muchos productos de una vez?',
    a: <>Ve a <Link href="/inventario/importar" className="text-primary underline-offset-2 hover:underline">Importar catálogo</Link> y pega tus productos en formato <em>Nombre; Precio; Categoría; Stock</em>. Crea las categorías que falten solo.</>,
  },
  {
    q: '¿La boleta que imprime el POS sirve para el SII?',
    a: <>No. Es un comprobante interno de la venta, no un documento tributario. La emisión de boletas o facturas electrónicas ante el SII es responsabilidad tuya (la boleta electrónica está planificada para una versión futura).</>,
  },
  {
    q: '¿Qué diferencia hay entre administrador y empleado?',
    a: <>El administrador administra todo (configuración, usuarios, métodos de pago, suscripción). El empleado puede operar el día a día (vender, inventario, compras, gastos) pero no accede a la configuración. Todo queda en la bitácora.</>,
  },
  {
    q: '¿Cómo agrego a mi equipo?',
    a: <>En <Link href="/configuracion/usuarios" className="text-primary underline-offset-2 hover:underline">Configuración → Usuarios</Link> creas la cuenta de cada persona (con una clave temporal que les entregas) y le asignas su rol.</>,
  },
  {
    q: '¿Cómo cambio mi contraseña?',
    a: <>Cierra sesión y usa «¿Olvidaste tu contraseña?» en el inicio de sesión para recibir un enlace de recuperación.</>,
  },
  {
    q: '¿Cómo exporto mis ventas a Excel?',
    a: <>En los reportes de ventas e IVA hay un botón <strong>«Exportar»</strong> que descarga un archivo CSV compatible con Excel (formato chileno).</>,
  },
  {
    q: '¿Qué es el reporte F29?',
    a: <>Es el formulario mensual de IVA del SII. Gestionala te calcula el débito (IVA de tus ventas) menos el crédito (IVA de tus gastos) por mes, como insumo para llenarlo.</>,
  },
];

export default function AyudaPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        icon={BookOpen}
        title="Centro de ayuda"
        description="Guía de uso y preguntas frecuentes."
      />

      {/* Guía de uso */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Guía de uso</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {GUIAS.map(({ icon: Icon, titulo, pasos }) => (
            <div key={titulo} className="rounded-2xl glass p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="grad-brand-vivid inline-flex rounded-xl p-2 text-white shadow">
                  <Icon className="size-[18px]" />
                </div>
                <h3 className="font-semibold">{titulo}</h3>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
                {pasos.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl glass px-4 py-3 text-sm shadow-sm [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                {q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA soporte */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl glass p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grad-brand-vivid inline-flex rounded-xl p-2.5 text-white shadow">
            <LifeBuoy className="size-5" />
          </div>
          <div>
            <div className="font-semibold">¿No encontraste lo que buscabas?</div>
            <p className="text-sm text-muted-foreground">Escríbenos y te ayudamos.</p>
          </div>
        </div>
        <Link
          href="/soporte"
          className="grad-brand-vivid rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02]"
        >
          Ir a Soporte
        </Link>
      </div>
    </div>
  );
}
