import type { LucideIcon } from 'lucide-react';

/** Encabezado de página consistente: icono de marca + título + descripción,
 *  con un slot opcional de acción a la derecha. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="grad-brand-vivid flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/25">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
