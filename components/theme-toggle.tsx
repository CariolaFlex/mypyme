'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const esOscuro = resolvedTheme === 'dark';
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(esOscuro ? 'light' : 'dark')}
      aria-label="Cambiar tema"
    >
      {esOscuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {esOscuro ? 'Modo claro' : 'Modo oscuro'}
    </Button>
  );
}
