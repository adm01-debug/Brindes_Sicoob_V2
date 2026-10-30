/**
 * print-area-grouping — Utilitário para agrupar áreas de personalização
 * por componente e localização, facilitando exibição hierárquica no simulador.
 *
 * Features:
 * - Agrupamento hierárquico: Componente → Localização → Técnicas
 * - Priorização de áreas primárias
 * - Filtragem por técnica
 * - Estatísticas e resumos
 * - Detecção de área máxima por grupo
 */
import type { PrintAreaWithTechniques, GroupedPrintArea } from "@/types/gravacao";

type GroupedTechnique = GroupedPrintArea["locations"][number]["techniques"][number];
type LocationTechniqueMap = Map<string, GroupedPrintArea["locations"][number]["techniques"]>;

function valueOr<T>(value: T | null | undefined | false | "" | 0, fallback: T): T {
  return value ? value as T : fallback;
}

function techniqueFromArea(
  area: PrintAreaWithTechniques,
  technique: PrintAreaWithTechniques["techniques"][number],
): GroupedTechnique {
  const hasArea = Boolean(area.max_width) && Boolean(area.max_height);
  return {
    id: area.area_id,
    areaName: area.area_name,
    techniqueCode: technique.codigo,
    maxWidth: area.max_width ?? null,
    maxHeight: area.max_height ?? null,
    maxColors: null,
    areaCm2: hasArea ? Math.round(area.max_width * area.max_height * 100) / 100 : null,
    isCurved: area.is_curved,
    isPrimary: area.is_primary,
    servCode: technique.codigo,
  };
}

function getLocationMap(
  componentMap: Map<string, LocationTechniqueMap>,
  componentName: string,
): LocationTechniqueMap {
  const existing = componentMap.get(componentName);
  if (existing) return existing;
  const created = new Map<string, GroupedPrintArea["locations"][number]["techniques"]>();
  componentMap.set(componentName, created);
  return created;
}

function getTechniques(locationMap: LocationTechniqueMap, locationName: string) {
  const existing = locationMap.get(locationName);
  if (existing) return existing;
  const created: GroupedPrintArea["locations"][number]["techniques"] = [];
  locationMap.set(locationName, created);
  return created;
}

function addAreaToComponentMap(
  componentMap: Map<string, LocationTechniqueMap>,
  area: PrintAreaWithTechniques,
): void {
  const componentName = valueOr(area.component_name, "Produto");
  const locationName = valueOr(area.location_name, valueOr(area.area_name, "Padrão"));
  const techniques = getTechniques(getLocationMap(componentMap, componentName), locationName);
  for (const technique of area.techniques) {
    const duplicate = techniques.some((candidate) => (
      candidate.techniqueCode === technique.codigo && candidate.id === area.area_id
    ));
    if (!duplicate) techniques.push(techniqueFromArea(area, technique));
  }
}

function primaryLocationOrder(
  left: GroupedPrintArea["locations"][number],
  right: GroupedPrintArea["locations"][number],
): number {
  const leftPrimary = left.techniques.some((technique) => technique.isPrimary);
  const rightPrimary = right.techniques.some((technique) => technique.isPrimary);
  if (leftPrimary === rightPrimary) return 0;
  return leftPrimary ? -1 : 1;
}

function componentOrder(left: GroupedPrintArea, right: GroupedPrintArea): number {
  if (left.componentName === "Produto") return -1;
  if (right.componentName === "Produto") return 1;
  return left.componentName.localeCompare(right.componentName);
}

function groupedComponent(componentName: string, locationsMap: LocationTechniqueMap): GroupedPrintArea {
  const locations = Array.from(locationsMap, ([locationName, techniques]) => ({
    locationName,
    locationCode: locationName.toLowerCase().replace(/\s+/g, "-"),
    techniques,
  }));
  locations.sort(primaryLocationOrder);
  return {
    componentName,
    componentCode: componentName.toLowerCase().replace(/\s+/g, "-"),
    locations,
  };
}

// ============================================
// AGRUPAMENTO PRINCIPAL
// ============================================

/**
 * Agrupa áreas de impressão/personalização por componente → localização → técnicas.
 * Áreas sem componente são agrupadas sob "Produto" (default).
 */
export function groupPrintAreasByComponent(
  areas: PrintAreaWithTechniques[]
): GroupedPrintArea[] {
  if (!areas.length) return [];

  const componentMap = new Map<string, LocationTechniqueMap>();
  for (const area of areas) addAreaToComponentMap(componentMap, area);
  return Array.from(componentMap, ([name, locations]) => groupedComponent(name, locations))
    .sort(componentOrder);
}

// ============================================
// FILTROS E CONSULTAS
// ============================================

/**
 * Retorna todas as técnicas únicas de todas as áreas agrupadas.
 */
export function getUniqueTechniques(groups: GroupedPrintArea[]): string[] {
  const set = new Set<string>();
  for (const g of groups) {
    for (const loc of g.locations) {
      for (const tech of loc.techniques) {
        set.add(tech.techniqueCode);
      }
    }
  }
  return Array.from(set).sort();
}

/**
 * Filtra áreas agrupadas por técnica específica.
 */
export function filterGroupsByTechnique(
  groups: GroupedPrintArea[],
  techniqueCode: string
): GroupedPrintArea[] {
  return groups
    .map((g) => ({
      ...g,
      locations: g.locations
        .map((loc) => ({
          ...loc,
          techniques: loc.techniques.filter((t) => t.techniqueCode === techniqueCode),
        }))
        .filter((loc) => loc.techniques.length > 0),
    }))
    .filter((g) => g.locations.length > 0);
}

/**
 * Filtra áreas agrupadas por componente específico.
 */
export function filterGroupsByComponent(
  groups: GroupedPrintArea[],
  componentName: string
): GroupedPrintArea[] {
  return groups.filter((g) => g.componentName === componentName);
}

/**
 * Achata toda a hierarquia em uma lista plana de técnicas com contexto.
 * Útil para iteração simples no simulador.
 */
export interface FlattenedTechnique {
  componentName: string;
  componentCode: string;
  locationName: string;
  locationCode: string;
  techniqueCode: string;
  areaName: string;
  maxWidth: number | null;
  maxHeight: number | null;
  areaCm2: number | null;
  isPrimary: boolean;
  isCurved: boolean;
}

export function flattenTechniques(groups: GroupedPrintArea[]): FlattenedTechnique[] {
  const result: FlattenedTechnique[] = [];
  for (const g of groups) {
    for (const loc of g.locations) {
      for (const tech of loc.techniques) {
        result.push({
          componentName: g.componentName,
          componentCode: g.componentCode,
          locationName: loc.locationName,
          locationCode: loc.locationCode,
          techniqueCode: tech.techniqueCode,
          areaName: tech.areaName,
          maxWidth: tech.maxWidth,
          maxHeight: tech.maxHeight,
          areaCm2: tech.areaCm2,
          isPrimary: tech.isPrimary,
          isCurved: tech.isCurved,
        });
      }
    }
  }
  return result;
}

// CONTADORES E ESTATÍSTICAS
// ============================================

/**
 * Conta o total de áreas de impressão em todos os grupos.
 */
export function countTotalAreas(groups: GroupedPrintArea[]): number {
  let count = 0;
  for (const g of groups) {
    for (const loc of g.locations) {
      count += loc.techniques.length;
    }
  }
  return count;
}

/**
 * Conta total de localizações únicas.
 */
export function countTotalLocations(groups: GroupedPrintArea[]): number {
  let count = 0;
  for (const g of groups) {
    count += g.locations.length;
  }
  return count;
}

/**
 * Conta total de componentes.
 */
export function countTotalComponents(groups: GroupedPrintArea[]): number {
  return groups.length;
}

// ============================================
// RESUMO E ANÁLISE
// ============================================

export interface PrintAreaSummary {
  totalComponents: number;
  totalLocations: number;
  totalTechniqueSlots: number;
  uniqueTechniques: string[];
  hasPrimaryArea: boolean;
  hasCurvedArea: boolean;
  maxAreaCm2: number | null;
  primaryLocations: string[];
}

/**
 * Gera resumo estatístico completo das áreas agrupadas.
 */
export function summarizeGroups(groups: GroupedPrintArea[]): PrintAreaSummary {
  const uniqueTechniques = getUniqueTechniques(groups);
  const flat = flattenTechniques(groups);
  const areas = flat.map((technique) => technique.areaCm2).filter((area): area is number => area !== null);
  const primaryLocations = [...new Set(
    flat.filter((technique) => technique.isPrimary).map((technique) => technique.locationName),
  )];

  return {
    totalComponents: groups.length,
    totalLocations: countTotalLocations(groups),
    totalTechniqueSlots: flat.length,
    uniqueTechniques,
    hasPrimaryArea: flat.some((technique) => technique.isPrimary),
    hasCurvedArea: flat.some((technique) => technique.isCurved),
    maxAreaCm2: areas.length ? Math.max(...areas) : null,
    primaryLocations,
  };
}

/**
 * Encontra a maior área disponível (em cm²) entre todos os grupos.
 */
export function findLargestArea(
  groups: GroupedPrintArea[]
): { componentName: string; locationName: string; areaCm2: number } | null {
  let largest: { componentName: string; locationName: string; areaCm2: number } | null = null;

  for (const technique of flattenTechniques(groups)) {
    if (technique.areaCm2 === null) continue;
    if (largest && technique.areaCm2 <= largest.areaCm2) continue;
    largest = {
      componentName: technique.componentName,
      locationName: technique.locationName,
      areaCm2: technique.areaCm2,
    };
  }

  return largest;
}
