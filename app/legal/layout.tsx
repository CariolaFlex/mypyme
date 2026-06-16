import Link from 'next/link';
import { LEGAL } from '@/lib/legal';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/login" className="flex items-center gap-2 font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/icon-192.png" alt="" className="size-8 rounded-lg" />
            {LEGAL.marca}
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/legal/terminos" className="text-muted-foreground hover:text-foreground">
              Términos
            </Link>
            <Link href="/legal/privacidad" className="text-muted-foreground hover:text-foreground">
              Privacidad
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
