import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ShoppingCart, Wallet, Boxes, Truck, BarChart3,
  WifiOff, Check, ArrowRight, Receipt,
} from 'lucide-react';
import { PLANES } from '@/lib/flow/subscription';
import { LEGAL } from '@/lib/legal';
import { clp } from '@/lib/reportes';

export const metadata: Metadata = {
  title: { absolute: 'Gestionala — POS, caja e inventario para tu negocio' },
  description:
    'El punto de venta para almacenes, minimarkets y kioscos de Chile. POS táctil que funciona sin internet, caja con cuadratura, inventario, compras y reportes con IVA (F29). Prueba 14 días gratis.',
  keywords: [
    'POS Chile', 'punto de venta', 'sistema para almacén', 'caja minimarket',
    'control de inventario', 'software para kiosco', 'POS offline', 'reporte IVA F29',
    'gestión micro pyme',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Gestionala — POS, caja e inventario para tu negocio',
    description:
      'POS táctil que funciona sin internet, caja con cuadratura, inventario y reportes con IVA. Hecho para almacenes, minimarkets y kioscos de Chile.',
    url: '/',
    siteName: 'Gestionala',
    locale: 'es_CL',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: ShoppingCart,
    titulo: 'POS táctil y rápido',
    desc: 'Cobra en segundos con buscador, categorías y multi-pago. Imprime comprobante térmico al instante.',
  },
  {
    icon: WifiOff,
    titulo: 'Funciona sin internet',
    desc: 'Si se cae la conexión, sigues vendiendo. Las ventas se sincronizan solas al volver la señal.',
  },
  {
    icon: Wallet,
    titulo: 'Caja con cuadratura',
    desc: 'Abre y cierra caja con arqueo automático. Detecta diferencias y registra cada movimiento.',
  },
  {
    icon: Boxes,
    titulo: 'Inventario y stock',
    desc: 'Control de stock en tiempo real, alertas de bajo stock e importación masiva de tu catálogo.',
  },
  {
    icon: Truck,
    titulo: 'Compras y proveedores',
    desc: 'Órdenes de compra, recepción de mercadería, cuentas por pagar y registro de gastos.',
  },
  {
    icon: BarChart3,
    titulo: 'Reportes e IVA (F29)',
    desc: 'Ventas por día, método y producto. Débito y crédito de IVA listos para tu F29. Exporta a Excel.',
  },
];

const PLAN_FEATURES: Record<string, string[]> = {
  emprende: [
    'POS con offline',
    'Caja e inventario',
    'Reportes e IVA (F29)',
    'Compras y gastos',
    'Soporte por correo',
  ],
  pyme: [
    'Todo lo de Emprende',
    'Múltiples usuarios y roles',
    'Bitácora de cambios',
    'Reporte por cajero',
    'Soporte prioritario',
  ],
};

export default function LandingPage() {
  return (
    <main className="mesh-bg grid-pattern relative min-h-screen overflow-hidden">
      {/* Blobs navy flotantes */}
      <div className="blob left-[8%] top-[-8rem] size-[28rem]" style={{ background: '#2563eb' }} />
      <div className="blob right-[-6rem] top-[20%] size-[24rem]" style={{ background: '#0d1b2a', animationDelay: '-7s' }} />
      <div className="blob bottom-[-10rem] left-[30%] size-[22rem]" style={{ background: '#647da6', animationDelay: '-13s' }} />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Nav */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-192.png" alt="Gestionala" className="size-9 rounded-xl shadow-sm" />
            <span className="text-lg font-black tracking-tight">Gestionala</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="grad-brand-vivid rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03]"
            >
              Crear cuenta
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <div className="animate-in fade-in-50 slide-in-from-bottom-3 duration-700">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <span className="pulse-dot inline-block size-2 rounded-full bg-primary" />
              Hecho para el comercio chileno
            </div>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              El punto de venta de tu{' '}
              <span className="text-grad-brand animate-gradient-x">almacén</span>, sin complicaciones
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              POS, caja, inventario y reportes con IVA en un solo lugar. Funciona incluso
              sin internet. Pensado para almacenes, minimarkets y kioscos.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="grad-brand-vivid inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03]"
              >
                Empieza gratis
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="#planes"
                className="rounded-xl border border-border bg-card/60 px-6 py-3 text-base font-semibold text-foreground/80 backdrop-blur transition-colors hover:text-foreground"
              >
                Ver planes
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              14 días de prueba gratis · Sin tarjeta para empezar · Cancela cuando quieras
            </p>
          </div>

          {/* Mockup glass */}
          <div className="relative animate-in fade-in-50 slide-in-from-bottom-5 duration-1000">
            <div className="glass-strong glow-brand rounded-3xl p-6 shadow-2xl shadow-[#0d1b2a]/15">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="size-5 text-primary" />
                  <span className="font-semibold">Caja abierta</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600">
                  En línea
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Ventas hoy', v: clp.format(184500), i: BarChart3 },
                  { l: 'En caja', v: clp.format(212300), i: Wallet },
                  { l: 'Productos', v: '342', i: Boxes },
                  { l: 'IVA del mes', v: clp.format(98760), i: Receipt },
                ].map((k) => {
                  const Icon = k.i;
                  return (
                    <div key={k.l} className="rounded-2xl glass p-4">
                      <div className="mb-2 inline-flex rounded-lg grad-brand-vivid p-2 text-white shadow">
                        <Icon className="size-4" />
                      </div>
                      <div className="text-xs text-muted-foreground">{k.l}</div>
                      <div className="text-lg font-bold tracking-tight">{k.v}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Todo lo que tu negocio necesita
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Una sola herramienta para vender, controlar el stock y ordenar tus números.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, titulo, desc }) => (
              <div
                key={titulo}
                className="shine-card group rounded-2xl glass p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-xl grad-brand-vivid p-3 text-white shadow-lg shadow-primary/30">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-bold">{titulo}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Planes */}
        <section id="planes" className="scroll-mt-8 py-14 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Precios simples</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Un precio plano al mes. Sin comisiones por venta. Empieza con 14 días gratis.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {(['emprende', 'pyme'] as const).map((key) => {
              const plan = PLANES[key];
              const destacado = key === 'pyme';
              return (
                <div
                  key={key}
                  className={`relative rounded-3xl p-7 shadow-lg ${
                    destacado
                      ? 'glass-strong glow-brand border-2 border-primary/30'
                      : 'glass border border-border'
                  }`}
                >
                  {destacado && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 grad-brand-vivid rounded-full px-3 py-1 text-xs font-semibold text-white shadow">
                      Más completo
                    </span>
                  )}
                  <h3 className="text-xl font-bold">{plan.nombre}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tight">{clp.format(plan.precioMensual)}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {PLAN_FEATURES[key].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`mt-7 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${
                      destacado
                        ? 'grad-brand-vivid text-white shadow-lg shadow-primary/30'
                        : 'border border-primary/30 text-primary hover:bg-primary/5'
                    }`}
                  >
                    Empezar con {plan.nombre}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA final */}
        <section className="py-14 sm:py-20">
          <div className="grad-brand relative overflow-hidden rounded-3xl px-8 py-14 text-center shadow-2xl">
            <div className="blob right-[10%] top-[-4rem] size-[16rem]" style={{ background: '#2563eb', opacity: 0.4 }} />
            <div className="relative">
              <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Ordena tu negocio hoy
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-lg text-white/80">
                Crea tu cuenta en minutos y empieza a vender. 14 días gratis, sin tarjeta.
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-base font-bold text-[#0d1b2a] shadow-xl transition-transform hover:scale-[1.03]"
              >
                Crear mi cuenta gratis
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-border py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-192.png" alt="Gestionala" className="size-6 rounded-md" />
            <span>© {new Date().getFullYear()} {LEGAL.razonSocial}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/login" className="hover:text-foreground">Entrar</Link>
            <Link href="/register" className="hover:text-foreground">Crear cuenta</Link>
            <Link href="/legal/terminos" className="hover:text-foreground">Términos</Link>
            <Link href="/legal/privacidad" className="hover:text-foreground">Privacidad</Link>
            <a href={`mailto:${LEGAL.emailContacto}`} className="hover:text-foreground">Contacto</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
