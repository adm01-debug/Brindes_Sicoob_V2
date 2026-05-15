import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';

/**
 * ThemeInitializer — mounted globally in App.tsx, OUTSIDE routes.
 * Restores the saved skin on every page load and when light/dark mode changes.
 * Optimized to avoid redundant applications.
 */
export function ThemeInitializer() {
  const { actualTheme } = useTheme();
  const lastAppliedRef = useRef<{ presetId: string; mode: string; radius: number } | null>(null);

  useEffect(() => {
    const cfg = loadThemeConfig();
    
    const needsApply = !lastAppliedRef.current || 
      lastAppliedRef.current.presetId !== cfg.presetId || 
      lastAppliedRef.current.mode !== actualTheme || 
      lastAppliedRef.current.radius !== cfg.radius;

    if (needsApply) {
      applyThemePreset(cfg.presetId, actualTheme);
      applyRadius(cfg.radius);
      lastAppliedRef.current = { presetId: cfg.presetId, mode: actualTheme, radius: cfg.radius };
    }
  }, [actualTheme]);

  return null;
}
