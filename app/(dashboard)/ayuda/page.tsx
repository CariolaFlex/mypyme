import Link from 'next/link';
import type { Metadata } from 'next';
import {
  BookOpen, Settings, Package, Wallet, ShoppingCart, Truck, BarChart3,
  ChevronDown, LifeBuoy, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { ModuleCard } from '@/components/help/primitives';
import { MODULOS } from '@/lib/ayuda/manual';
import { GlosarioBuscable } from './glosario-buscable';

export const metadata: Metadata = {
  title: 'Centro de ayuda',
  description: 'Guías, manual por módulo, glosario y preguntas frecuentes de Gestionala.',
};

// Flujo recomendado para arrancar (orden sugerido para un negocio nuevo).
const FLUJO: { icon: LucideIcon; titulo: string; texto: string; href: string }[] = [
  { icon: Settings, titulo: 'Configura tu negocio', texto: 'Razón social, RUT e IVA.', href: '/configuracion/negocio' },
  { icon: Package, titulo: 'Carga tu catálogo', texto: 'Productos, precios y stock.', href: '/ayuda/productos' },
  { icon: Wallet, titulo: 'Abre la caja', texto: 'Declara el efectivo inicial.', href: '/ayuda/caja' },
  { icon: ShoppingCart, titulo: 'Haz tu primera venta', texto: 'Cobra en el punto de venta.', href: '/ayuda/pos' },
  { icon: Truck, titulo: 'Registra compras y gastos', texto: 'Proveedores e IVA crédito.', href: '/ayuda/compras' },
  { icon: BarChart3, titulo: 'Revisa tus reportes', texto: 'Ventas e IVA del mes (F29).', href: '/ayuda/reportes-iva' },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: '¿Puedo vender sin internet?',
    a: <>Sí. El Punto de venta funciona offline: las ventas se guardan en tu dispositivo y se sincronizan solas al volver la conexión.</>,
  },
  {
    q: '¿La boleta que imprime el POS sirve para el SII?',
    a: <>No. Es un comprobante interno, no un documento tributario. La emisión de boletas/facturas electrónicas ante el SII es responsabilidad tuya (planificada para una versión futura).</>,
  },
  {
    q: '¿El precio se ingresa con o sin IVA?',
    a: <><strong>Con IVA incluido.</strong> El sistema calcula el neto y el IVA según la tasa configurada en tu negocio.</>,
  },
  {
    q: '¿Cómo cambio mi contraseña?',
    a: <>Cierra sesión y usa «¿Olvidaste tu contraseña?» en el inicio de sesión para recibir un enlace de recuperación.</>,
  },
  {
    q: '¿Qué pasa cuando termina mi prueba gratis?',
    a: <>Para seguir usando Gestionala inscribes una tarjeta en <Link href="/configuracion/suscripcion" className="text-primary underline-offset-2 hover:underline">Configuración → Suscripción</Link>. Durante la prueba no se cobra nada.</>,
  },
];

export default function AyudaPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <PageHeader
        icon={BookOpen}
        title="Centro de ayuda"
        description="Una guía clara para sacarle todo el provecho a Gestionala."
      />

      {/* Flujo recomendado */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">¿Recién empiezas? Sigue este orden</h2>
          <p className="text-sm text-muted-foreground">Seis pasos para dejar tu negocio funcionando.</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FLUJO.map(({ icon: Icon, titulo, texto, href }, i) => (
            <li key={titulo}>
              <Link
                href={href}
                className="group flex h-full items-start gap-3 rounded-2xl glass p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="relative shrink-0">
                  <div className="grad-brand-vivid flex size-10 items-center justify-center rounded-xl text-white shadow shadow-primary/25">
                    <Icon className="size-5" />
                  </div>
                  <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-card bg-foreground text-[10px] font-bold text-background">
                    {i + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-semibold leading-tight">
                    {titulo}
                    <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{texto}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Manual por módulo */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Manual por módulo</h2>
          <p className="text-sm text-muted-foreground">
            Cada función explicada paso a paso, con ilustraciones y preguntas frecuentes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULOS.map((m) => (
            <ModuleCard
              key={m.slug}
              href={`/ayuda/${m.slug}`}
              icon={m.icono}
              titulo={m.titulo}
              descripcion={m.resumen}
            />
          ))}
        </div>
      </section>

      {/* Glosario */}
      <section id="glosario" className="scroll-mt-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold">Glosario</h2>
          <p className="text-sm text-muted-foreground">
            ¿Una palabra que no conoces? Búscala acá. También aparece al pasar el mouse sobre los
            términos subrayados en la plataforma.
          </p>
        </div>
        <GlosarioBuscable />
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
