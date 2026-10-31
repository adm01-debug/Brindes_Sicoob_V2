import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { loadThemeConfig, applyThemePreset, applyRadius, saveThemeConfig } from '@/lib/theme-presets';

export type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const DARK_SCHEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = 'auto',
  storageKey = 'gifts-store-theme',
}: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (theme === 'auto') {
      return window.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches ? 'dark' : 'light';
    }
    return theme;
  });

  // Atualizar tema quando mudar
  useEffect(() => {
    const root = window.document.documentElement;

    // Remover temas anteriores
    root.classList.remove('light', 'dark');

    let resolved: 'light' | 'dark';
    if (theme === 'auto') {
      resolved = window.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    root.classList.add(resolved);
    setActualTheme(resolved);

    // Re-apply theme preset CSS variables for the new mode
    const cfg = loadThemeConfig();
    applyThemePreset(cfg.presetId, resolved);
    applyRadius(cfg.radius);
  }, [theme]);

  // Listener para mudanças no tema do sistema
  useEffect(() => {
    if (theme !== 'auto') return;

    const mediaQuery = window.matchMedia(DARK_SCHEME_MEDIA_QUERY);

    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setActualTheme(resolved);
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);

      // Re-apply preset for new system mode
      const cfg = loadThemeConfig();
      applyThemePreset(cfg.presetId, resolved);
      applyRadius(cfg.radius);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
    
    // Persist to theme config SSOT
    const cfg = loadThemeConfig();
    saveThemeConfig({ ...cfg, mode: newTheme });

    // Announce theme change for accessibility
    const themeLabel = newTheme === "auto" ? "do Sistema" : newTheme === "dark" ? "Escuro" : "Claro";
    window.dispatchEvent(new CustomEvent('a11y-announce', { 
      detail: { message: `Tema alterado para modo ${themeLabel}` } 
    }));
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme(actualTheme === 'light' ? 'dark' : 'light');
  }, [actualTheme, setTheme]);

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
