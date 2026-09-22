import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";

// =====================================================
// TIPOS DO SISTEMA DE CORES (3 Níveis)
// =====================================================

export interface ColorGroup {
  id: string;
  name: string;
  slug: string;
  hex_code: string | null;
  internal_code: string | null;
  variations: ColorVariation[];
}

export interface ColorVariation {
  id: string;
  name: string;
  slug: string;
  hex_code: string | null;
  internal_code: string | null;
  group_id: string;
}

export interface ColorNuance {
  id: string;
  name: string;
  slug: string;
}

export interface ColorFilters {
  groups: ColorGroup[];
  nuances: ColorNuance[];
}

type ExternalColorGroup = Omit<ColorGroup, 'variations'>;
type ExternalColorVariation = ColorVariation;

function isCatalogUnavailable(payload: { _unconfigured?: boolean; error?: string } | null): boolean {
  return payload?._unconfigured === true || payload?.error === 'CATALOG_NOT_CONFIGURED';
}

function externalRecords<T extends object>(response: { data?: unknown; error?: { message: string } | null }, label: string): T[] {
  if (response.error) throw new Error(`Erro ao buscar ${label}: ${response.error.message}`);

  const payload = response.data as {
    data?: { records?: T[] };
    records?: T[];
    error?: string;
    _unconfigured?: boolean;
  } | null;
  if (isCatalogUnavailable(payload)) {
    throw new Error('O catálogo externo ainda não está configurado.');
  }

  const records = payload?.data?.records ?? payload?.records;
  if (!Array.isArray(records)) throw new Error(`Resposta inválida ao buscar ${label} no catálogo externo.`);
  return records;
}

// =====================================================
// HELPER - Busca dados do banco externo Promobrind
// =====================================================

async function fetchExternalColors() {
  // Buscar grupos de cores
  const groupsResponse = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'color_groups',
      operation: 'select',
      filters: { is_active: true },
      orderBy: { column: 'sort_order', ascending: true },
      countMode: 'none',
    }
  });

  const groups = externalRecords<ExternalColorGroup>(groupsResponse, 'grupos de cores');

  // Buscar variações de cores
  const variationsResponse = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'color_variations',
      operation: 'select',
      filters: { is_active: true },
      orderBy: { column: 'sort_order', ascending: true },
      countMode: 'none',
    }
  });

  const variations = externalRecords<ExternalColorVariation>(variationsResponse, 'variações de cores');

  // Mapear variações para seus grupos
  const groupsWithVariations: ColorGroup[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug || (group.name || '').toLowerCase().replace(/\s+/g, '-'),
    hex_code: group.hex_code,
    internal_code: group.internal_code,
    variations: variations
      .filter((v) => v.group_id === group.id)
      .map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug || (v.name || '').toLowerCase().replace(/\s+/g, '-'),
        hex_code: v.hex_code,
        internal_code: v.internal_code,
        group_id: v.group_id
      }))
  }));

  return groupsWithVariations;
}

async function fetchExternalNuances(): Promise<ColorNuance[]> {
  const response = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'color_nuances',
      operation: 'select',
      filters: { is_active: true },
      orderBy: { column: 'sort_order', ascending: true },
      countMode: 'none',
    },
  });

  return externalRecords<ColorNuance>(response, 'nuances de cores').map((nuance) => ({
    id: nuance.id,
    name: nuance.name,
    slug: nuance.slug,
  }));
}

// =====================================================
// HOOK PRINCIPAL - Carrega toda a hierarquia de cores do Promobrind
// =====================================================

export function useColorSystem() {
  return useQuery<ColorFilters>({
    queryKey: ['color-system-external'],
    queryFn: async () => {
      const groups = await fetchExternalColors();
      
      let nuances: ColorNuance[] = [];
      try {
        nuances = await fetchExternalNuances();
      } catch (error) {
        logger.warn('Nuances não disponíveis no catálogo externo:', error);
      }

      return {
        groups,
        nuances
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
  });
}

// =====================================================
// HOOKS INDIVIDUAIS
// =====================================================

/**
 * Hook para buscar apenas os grupos de cor (para filtros rápidos)
 */
export function useColorGroups() {
  return useQuery<ColorGroup[]>({
    queryKey: ['color-groups-external'],
    queryFn: async () => {
      return await fetchExternalColors();
    },
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook para buscar apenas as nuances/acabamentos
 */
export function useColorNuances() {
  return useQuery<ColorNuance[]>({
    queryKey: ['color-nuances'],
    queryFn: async () => {
      return fetchExternalNuances();
    },
    staleTime: 60 * 60 * 1000,
  });
}

/**
 * Hook para buscar variações de um grupo específico
 */
export function useColorVariations(groupId: string | null) {
  return useQuery<ColorVariation[]>({
    queryKey: ['color-variations-external', groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const response = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'color_variations',
          operation: 'select',
          filters: { group_id: groupId, is_active: true },
          orderBy: { column: 'sort_order', ascending: true }
        }
      });

      return externalRecords<ExternalColorVariation>(response, 'variações de cores').map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug || (v.name || '').toLowerCase().replace(/\s+/g, '-'),
        hex_code: v.hex_code,
        internal_code: v.internal_code,
        group_id: v.group_id
      }));
    },
    enabled: !!groupId,
    staleTime: 60 * 60 * 1000,
  });
}

// =====================================================
// UTILITÁRIOS
// =====================================================

/**
 * Encontra um grupo pelo slug
 */
export function findGroupBySlug(groups: ColorGroup[], slug: string): ColorGroup | undefined {
  return groups.find(g => g.slug === slug);
}

/**
 * Encontra uma variação pelo slug dentro de um grupo
 */
export function findVariationBySlug(group: ColorGroup, slug: string): ColorVariation | undefined {
  return group.variations.find(v => v.slug === slug);
}

/**
 * Formata o nome completo da cor (variação + nuance)
 */
export function formatColorName(variationName: string, nuanceName?: string): string {
  if (nuanceName) {
    return `${variationName} ${nuanceName}`;
  }
  return variationName;
}

/**
 * Verifica se uma cor é clara (para decidir cor do texto)
 */
export function isLightColor(hexCode: string | null): boolean {
  if (!hexCode) return true;
  
  const hex = hexCode.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Fórmula de luminosidade
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
