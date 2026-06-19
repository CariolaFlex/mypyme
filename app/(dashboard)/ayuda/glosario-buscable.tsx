'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GLOSARIO, GLOSARIO_CATEGORIAS } from '@/lib/glosario';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function GlosarioBuscable() {
  const [q, setQ] = useState('');

  const filtrados = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return GLOSARIO;
    return GLOSARIO.filter((t) => norm(`${t.termino} ${t.definicion}`).includes(nq));
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar término (ej. IVA, cuadratura, SKU)…"
          className="pl-9"
        />
      </div>

      {GLOSARIO_CATEGORIAS.map((cat) => {
        const items = filtrados.filter((t) => t.categoria === cat);
        if (!items.length) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{cat}</h3>
            <dl className="grid gap-2 sm:grid-cols-2">
              {items.map((t) => (
                <div key={t.slug} className="rounded-xl glass p-3 text-sm shadow-sm">
                  <dt className="font-semibold text-foreground">{t.termino}</dt>
                  <dd className="mt-0.5 text-muted-foreground">{t.definicion}</dd>
                  <dd className="mt-1 text-xs text-muted-foreground/80">
                    <span className="font-medium">Ej:</span> {t.ejemplo}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      {!filtrados.length && (
        <p className="rounded-xl glass px-4 py-6 text-center text-sm text-muted-foreground shadow-sm">
          No encontramos «{q}». Prueba con otra palabra o escríbenos a Soporte.
        </p>
      )}
    </div>
  );
}
