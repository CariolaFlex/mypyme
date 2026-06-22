import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Lightbulb, AlertTriangle, Info, ArrowRight } from 'lucide-react';

/** Ilustración SVG enmarcada en una tarjeta glass, con pie opcional. */
export function HelpFigure({
  children,
  caption,
}: {
  children: React.ReactNode;
  caption?: React.ReactNode;
}) {
  return (
    <figure className="overflow-hidden rounded-2xl glass p-4 shadow-sm">
      <div className="mx-auto max-w-md">{children}</div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs text-muted-foreground">{caption}</figcaption>
      )}
    </figure>
  );
}

/** Pasos numerados en columna, con conector vertical (stepper de manual). */
export function Pasos({ pasos }: { pasos: { titulo: string; detalle: React.ReactNode }[] }) {
  return (
    <ol className="relative space-y-5 border-l border-border pl-8">
      {pasos.map((p, i) => (
        <li key={i} className="relative">
          <span className="grad-brand-vivid absolute -left-[2.45rem] flex size-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-md shadow-primary/30">
            {i + 1}
          </span>
          <h4 className="font-semibold leading-tight">{p.titulo}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            {p.detalle}
          </p>
        </li>
      ))}
    </ol>
  );
}

const CALLOUT = {
  tip: { icon: Lightbulb, cls: 'border-primary/25 bg-primary/5', ic: 'text-primary' },
  aviso: { icon: AlertTriangle, cls: 'border-amber-500/30 bg-amber-500/10', ic: 'text-amber-600' },
  info: { icon: Info, cls: 'border-border bg-muted/30', ic: 'text-muted-foreground' },
} as const;

/** Caja de consejo / aviso / nota. */
export function Callout({
  tipo = 'tip',
  children,
}: {
  tipo?: keyof typeof CALLOUT;
  children: React.ReactNode;
}) {
  const c = CALLOUT[tipo];
  const Icon = c.icon;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${c.cls}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${c.ic}`} />
      <div className="leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground">{children}</div>
    </div>
  );
}

/** Tarjeta de módulo para el hub: icono + título + descripción, linkeable. */
export function ModuleCard({
  href,
  icon: Icon,
  titulo,
  descripcion,
}: {
  href: string;
  icon: LucideIcon;
  titulo: string;
  descripcion: string;
}) {
  return (
    <Link
      href={href}
      className="shine-card group flex items-start gap-3.5 rounded-2xl glass p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="grad-brand-vivid inline-flex shrink-0 rounded-xl p-2.5 text-white shadow shadow-primary/25">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 font-semibold">
          {titulo}
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>
      </div>
    </Link>
  );
}
