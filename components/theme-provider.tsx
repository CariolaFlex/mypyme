'use client';

// Provider de tema propio (light/dark), reemplaza next-themes para evitar el
// warning de React 19 "Encountered a script tag while rendering React component"
// (next-themes renderiza un <script> anti-flash desde un componente cliente).
// El anti-flash lo hace un script server-side en el layout (no dispara el warning).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
type ThemeCtx = { theme: Theme; resolvedTheme: Theme; setTheme: (t: Theme) => void };

export const THEME_STORAGE_KEY = 'theme';
const ThemeContext = createContext<ThemeCtx | null>(null);

function aplicar(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Arranca en 'light' (coincide con el SSR); el valor real se sincroniza tras
  // montar leyendo el DOM (que el script anti-flash ya dejó correcto).
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Sincroniza el estado con lo que el script anti-flash aplicó al <html>
    // (sistema externo: no se puede leer en SSR sin desajustar la hidratación).
    const inicial: Theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(inicial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* almacenamiento no disponible */
    }
    aplicar(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Compatible con la API que usábamos de next-themes (theme/resolvedTheme/setTheme). */
export function useTheme(): ThemeCtx {
  return (
    useContext(ThemeContext) ?? {
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: () => {},
    }
  );
}

/** Snippet inline para el <head> (se ejecuta antes del primer paint → sin flash).
 *  Rendible desde un Server Component, por eso NO dispara el warning de React 19. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');document.documentElement.classList.toggle('dark', t==='dark');}catch(e){}})();`;
