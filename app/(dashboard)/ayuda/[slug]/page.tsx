import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, ChevronDown, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { HelpFigure, Pasos, Callout } from '@/components/help/primitives';
import { ILUSTRACIONES } from '@/components/help/ilustraciones';
import { MODULOS, MODULOS_MAP } from '@/lib/ayuda/manual';
import { GLOSARIO_MAP } from '@/lib/glosario';

export function generateStaticParams() {
  return MODULOS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const m = MODULOS_MAP[slug];
  if (!m) return { title: 'Ayuda' };
  return { title: `${m.titulo} · Ayuda`, description: m.resumen };
}

export default async function ModuloAyudaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = MODULOS_MAP[slug];
  if (!m) notFound();

  const Figura = ILUSTRACIONES[slug];
  const terminos = (m.glosario ?? []).map((s) => GLOSARIO_MAP[s]).filter(Boolean);

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-4">
        <Link
          href="/ayuda"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Centro de ayuda
        </Link>
        <PageHeader icon={m.icono} title={m.titulo} description={m.resumen}>
          {m.abrirEn && (
            <Link
              href={m.abrirEn.href}
              className="grad-brand-vivid inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
            >
              {m.abrirEn.label} <ExternalLink className="size-3.5" />
            </Link>
          )}
        </PageHeader>
      </div>

      <p className="text-[15px] leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {m.intro}
      </p>

      {Figura && <HelpFigure>{<Figura />}</HelpFigure>}

      {/* Paso a paso */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Paso a paso</h2>
        <Pasos pasos={m.pasos} />
      </section>

      {/* Tips / avisos */}
      {m.tips && m.tips.length > 0 && (
        <section className="space-y-3">
          {m.tips.map((t, i) => (
            <Callout key={i} tipo={t.tipo}>
              {t.texto}
            </Callout>
          ))}
        </section>
      )}

      {/* FAQ del módulo */}
      {m.faqs && m.faqs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Preguntas frecuentes</h2>
          <div className="space-y-2">
            {m.faqs.map(({ q, a }) => (
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
      )}

      {/* Glosario relacionado */}
      {terminos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Términos relacionados</h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            {terminos.map((t) => (
              <div key={t.slug} className="rounded-xl glass p-3 text-sm shadow-sm">
                <dt className="font-semibold text-foreground">{t.termino}</dt>
                <dd className="mt-0.5 text-muted-foreground">{t.definicion}</dd>
              </div>
            ))}
          </dl>
          <Link href="/ayuda#glosario" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Ver glosario completo <ArrowRight className="size-3.5" />
          </Link>
        </section>
      )}
    </div>
  );
}
