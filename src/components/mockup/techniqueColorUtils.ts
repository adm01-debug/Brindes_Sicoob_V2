/**
 * Technique color classification utilities
 * Extracted to a separate module to enable tree-shaking of the heavy Dialog component
 */

export type TechniqueCategory = "laser" | "serigrafia" | "digital" | "other";

export type LaserTone = "claro" | "escuro";

export interface TechniqueColorConfig {
  category: TechniqueCategory;
  laserTone?: LaserTone;
  colorCount?: number;
  selectedPantoneIndices?: number[];
  selectedColors?: { hex: string; pantoneCode: string }[];
  isFullColor?: boolean;
}

const LASER_TERMS = ["laser", "fibra", "co2"];
const LASER_UV_TERMS = ["laser uv", "uv laser"];
const SERIGRAPHY_TERMS = ["serigrafia", "silk", "tampografia"];
const DIGITAL_TERMS = ["digital", "uv", "sublima", "dtf", "transfer"];

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

/**
 * Determine which category a technique belongs to based on its name/code.
 */
export function classifyTechnique(techniqueName?: string, techniqueCode?: string | null): TechniqueCategory {
  if (!techniqueName && !techniqueCode) return "other";
  
  const combined = [techniqueCode, techniqueName].filter(Boolean).join(" ").toLowerCase();
  
  // Laser detection — must come before UV check since "Laser UV" exists
  if (includesAny(combined, LASER_TERMS)) {
    // Laser UV is actually a UV technique (full color capable)
    if (includesAny(combined, LASER_UV_TERMS)) {
      return "digital";
    }
    return "laser";
  }
  
  // Serigrafia detection
  if (includesAny(combined, SERIGRAPHY_TERMS)) {
    return "serigrafia";
  }
  
  // Digital / Full color techniques
  if (includesAny(combined, DIGITAL_TERMS)) {
    return "digital";
  }
  
  return "other";
}

/**
 * Check if a technique requires color configuration dialog
 */
export function techniqueNeedsColorConfig(techniqueName?: string, techniqueCode?: string | null): boolean {
  const cat = classifyTechnique(techniqueName, techniqueCode);
  return cat === "laser" || cat === "serigrafia";
}
