import { useMemo, useState, useEffect } from 'react';
import type { VoiceAgentPhase } from '@/hooks/useVoiceAgent';

function getThemeHSL(): [number, number, number] {
  if (typeof window === 'undefined') return [25, 95, 53];
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  const parts = raw.split(/\s+/).map((s) => parseFloat(s));
  if (parts.length >= 3 && !parts.some(isNaN)) {
    const [hue = 25, saturation = 95, lightness = 53] = parts;
    return [hue, saturation, lightness];
  }
  return [25, 95, 53];
}

export function hsl(h: number, s: number, l: number) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}
export function hsla(h: number, s: number, l: number, a: number) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

export interface PhaseColors {
  primary: string;
  secondary: string;
  accent: string;
  glow1: string;
  glow2: string;
  particles: string[];
}

const HUE = { pink: 330, violet: 270, magenta: 300, lavender: 285 } as const;
type BaseHsl = [number, number, number];

function listeningColors([h, s, l]: BaseHsl): PhaseColors {
  return {
    primary: hsl(h, s, l),
    secondary: hsl(HUE.pink, 80, 65),
    accent: hsl(HUE.violet, 70, 60),
    glow1: hsla(h, s, l, 0.5),
    glow2: hsla(HUE.pink, 75, 60, 0.4),
    particles: [
      hsl(h, s, l),
      hsl(HUE.pink, 85, 65),
      hsl(HUE.pink, 75, 75),
      hsl(HUE.violet, 70, 60),
      hsl(HUE.violet, 65, 72),
      hsl(HUE.magenta, 80, 68),
    ],
  };
}

function processingColors(): PhaseColors {
  return {
    primary: hsl(HUE.violet, 75, 58),
    secondary: hsl(HUE.pink, 80, 62),
    accent: hsl(HUE.magenta, 78, 65),
    glow1: hsla(HUE.violet, 75, 58, 0.5),
    glow2: hsla(HUE.pink, 80, 62, 0.4),
    particles: [
      hsl(HUE.violet, 75, 58),
      hsl(HUE.violet, 65, 70),
      hsl(HUE.magenta, 78, 65),
      hsl(HUE.pink, 80, 62),
      hsl(HUE.pink, 70, 72),
      hsl(HUE.lavender, 65, 70),
    ],
  };
}

function speakingColors([h, s, l]: BaseHsl): PhaseColors {
  return {
    primary: hsl(HUE.pink, 82, 62),
    secondary: hsl(h, s, l),
    accent: hsl(HUE.magenta, 75, 68),
    glow1: hsla(HUE.pink, 82, 62, 0.5),
    glow2: hsla(HUE.violet, 70, 58, 0.35),
    particles: [
      hsl(HUE.pink, 82, 62),
      hsl(HUE.pink, 75, 72),
      hsl(HUE.magenta, 75, 68),
      hsl(h, s, l),
      hsl(HUE.violet, 65, 65),
      hsl(HUE.lavender, 60, 75),
    ],
  };
}

function errorColors(): PhaseColors {
  return {
    primary: hsl(0, 75, 55),
    secondary: hsl(330, 70, 50),
    accent: hsl(0, 70, 65),
    glow1: hsla(0, 75, 55, 0.45),
    glow2: hsla(330, 70, 50, 0.3),
    particles: [hsl(0, 75, 55), hsl(0, 70, 65), hsl(0, 60, 75), hsl(330, 70, 50)],
  };
}

function bootingColors([h, s, l]: BaseHsl): PhaseColors {
  return {
    primary: hsl(h, s, l),
    secondary: hsl(HUE.violet, 65, 62),
    accent: hsl(HUE.pink, 70, 68),
    glow1: hsla(h, s, l, 0.4),
    glow2: hsla(HUE.violet, 65, 62, 0.35),
    particles: [
      hsl(h, s, l),
      hsl(HUE.pink, 70, 68),
      hsl(HUE.pink, 60, 78),
      hsl(HUE.violet, 65, 62),
      hsl(HUE.violet, 55, 72),
    ],
  };
}

function idleColors([h, s, l]: BaseHsl): PhaseColors {
  return {
    primary: hsl(h, s, l),
    secondary: hsl(HUE.pink, 75, 65),
    accent: hsl(HUE.violet, 65, 60),
    glow1: hsla(h, s, l, 0.35),
    glow2: hsla(HUE.pink, 70, 62, 0.25),
    particles: [
      hsl(h, s, l),
      hsl(HUE.pink, 75, 65),
      hsl(HUE.pink, 65, 75),
      hsl(HUE.violet, 65, 60),
      hsl(HUE.violet, 55, 72),
    ],
  };
}

function createPhaseColors(
  effectivePhase: VoiceAgentPhase | 'booting',
  baseHSL: BaseHsl,
): PhaseColors {
  if (effectivePhase === 'listening') return listeningColors(baseHSL);
  if (effectivePhase === 'processing') return processingColors();
  if (effectivePhase === 'speaking') return speakingColors(baseHSL);
  if (effectivePhase === 'error') return errorColors();
  if (effectivePhase === 'booting') return bootingColors(baseHSL);
  return idleColors(baseHSL);
}

export function usePhaseColors(phase: VoiceAgentPhase, isBooting: boolean): PhaseColors {
  const effectivePhase = isBooting ? 'booting' : phase;
  const [baseHSL, setBaseHSL] = useState<[number, number, number]>([25, 95, 53]);

  useEffect(() => {
    setBaseHSL(getThemeHSL());
    const obs = new MutationObserver(() => setBaseHSL(getThemeHSL()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => createPhaseColors(effectivePhase, baseHSL), [effectivePhase, baseHSL]);
}
