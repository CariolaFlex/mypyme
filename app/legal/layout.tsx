import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import { TocLegal } from './toc';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-192.png" alt="" className="size-8 rounded-lg" />
            {LEGAL.marca}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/legal/terminos" className="text-muted-foreground hover:text-foreground">
              Términos
            </Link>
            <Link href="/legal/privacidad" className="text-muted-foreground hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-3.5" /> Inicio
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <TocLegal />
        <div id="legal-article" className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
