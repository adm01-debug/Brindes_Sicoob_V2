import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

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

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    if (actualTheme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

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
