import type { LucideIcon } from 'lucide-react';
import { HelpTip } from '@/components/help-tip';

/** Encabezado de página consistente: icono de marca + título + descripción,
 *  con un botón de ayuda opcional y un slot de acción a la derecha. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  help,
  helpTitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Contenido del globo de ayuda contextual (qué es la sección y para qué sirve). */
  help?: React.ReactNode;
  helpTitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-3.5">
        <div className="grad-brand-vivid flex size-9 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/25 sm:size-11">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {help && <HelpTip titulo={helpTitle ?? `¿Qué es ${title}?`}>{help}</HelpTip>}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
