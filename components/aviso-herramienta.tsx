import { Sparkles } from 'lucide-react';

/**
 * Aviso amigable de que una herramienta automática (OCR de documentos o escáner
 * de barras/QR) está en mejora continua y puede equivocarse. Comunica de forma
 * profesional que aún no está 100% pulida, sin asustar al usuario.
 */
export function AvisoHerramienta({
  variante,
  className = '',
}: {
  variante: 'ocr' | 'barras';
  className?: string;
}) {
  const texto =
    variante === 'ocr'
      ? 'El lector de documentos está en mejora continua: puede equivocarse o no leer todo. Revisa y corrige los datos antes de guardar.'
      : 'El escáner está en mejora continua: a veces no lee el código a la primera o lo interpreta distinto. Verifica el resultado.';
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground ${className}`}
    >
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <span>{texto}</span>
    </div>
  );
}
