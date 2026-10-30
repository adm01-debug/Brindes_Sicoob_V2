import { useState, useEffect } from "react";
import { processLogoForLaser, processLogoForSerigrafia } from "@/utils/laser-logo-processor";
import type { TechniqueColorConfig } from "../techniqueColorUtils";

function createProcessingTask(
  logoPreview: string | null,
  category: TechniqueColorConfig["category"] | undefined,
  laserTone: TechniqueColorConfig["laserTone"],
  selectedColors: TechniqueColorConfig["selectedColors"],
): Promise<string> | null {
  if (!logoPreview) return null;
  if (category === "laser") {
    return processLogoForLaser(logoPreview, laserTone || "escuro");
  }
  if (category !== "serigrafia") return null;
  const colors = selectedColors || [];
  if (colors.length === 0) return null;
  return processLogoForSerigrafia(logoPreview, colors);
}

interface ProcessingSetters {
  setUrl: (url: string | null) => void;
  setProcessing: (processing: boolean) => void;
}

function trackProcessing(
  task: Promise<string>,
  isActive: () => boolean,
  { setUrl, setProcessing }: ProcessingSetters,
) {
  const updateWhenActive = (update: () => void) => {
    if (isActive()) update();
  };

  task
    .then((dataUrl) => updateWhenActive(() => setUrl(dataUrl)))
    .catch(() => updateWhenActive(() => setUrl(null)))
    .finally(() => updateWhenActive(() => setProcessing(false)));
}

/**
 * Canvas-based logo processing for Laser + Serigrafia techniques.
 * Laser: converts all visible pixels to a single solid tone (claro/escuro).
 * Serigrafia: maps each pixel to the nearest selected Pantone color.
 * Both preserve white/transparent gaps between logo elements.
 */
export function useLogoProcessing(
  logoPreview: string | null,
  techniqueColorConfig?: TechniqueColorConfig | null
) {
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const category = techniqueColorConfig?.category;
  const laserTone = techniqueColorConfig?.laserTone;
  const selectedColors = techniqueColorConfig?.selectedColors;

  useEffect(() => {
    const task = createProcessingTask(logoPreview, category, laserTone, selectedColors);
    if (!task) {
      setProcessedLogoUrl(null);
      setIsProcessing(false);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);
    trackProcessing(task, () => !cancelled, {
      setUrl: setProcessedLogoUrl,
      setProcessing: setIsProcessing,
    });

    return () => { cancelled = true; };
  }, [logoPreview, category, laserTone, selectedColors]);

  return { processedLogoUrl, isProcessing };
}
