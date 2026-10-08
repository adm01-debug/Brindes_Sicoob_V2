/**
 * External Database Hook - Ponto de entrada principal.
 * 
 * Modularizado em:
 * - src/lib/external-db/types.ts    → Interfaces de tipos
 * - src/lib/external-db/tables.ts   → Constantes de tabelas/views
 * - src/lib/external-db/invoke.ts   → Retry logic e error handling
 * 
 * Este arquivo contém o hook principal e re-exporta tudo para compatibilidade.
 */
import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

// Re-exportar tudo dos módulos para manter compatibilidade de imports
export * from '@/lib/external-db/types';
export * from '@/lib/external-db/tables';
export { extractFunctionErrorMessage } from '@/lib/external-db/invoke';

import type { ExternalTable } from '@/lib/external-db/tables';
import { invokeWithRetry, extractFunctionErrorMessage } from '@/lib/external-db/invoke';
import { logger } from "@/lib/logger";
import type {
  ExternalProduct,
  ExternalProductImage,
  ExternalProductVariant,
  ExternalCategory,
  ExternalSupplier,
  ExternalSupplierColor,
  ExternalSupplierMaterial,
  ExternalSupplierAttributeDefinition,
  ExternalSupplierProductAttribute,
  ExternalProductSupplier,
  ExternalTechnique,
  ExternalPriceTable,
  ExternalCollection,
  ExternalTag,
  ExternalCompany,
  ExternalClientContact,
  ExternalOrganization,
  ExternalRamoAtividade,
  ExternalRamoAtividadeFilho,
  ExternalBusinessSector,
  ExternalMaterialGroup,
  ExternalMaterialType,
  ExternalColorGroup,
  ExternalColorVariation,
} from '@/lib/external-db/types';

// ============================================
// TIPOS INTERNOS DO HOOK
// ============================================

type Operation = 'select' | 'insert' | 'update' | 'delete';

interface QueryOptions {
  filters?: Record<string, unknown>;
  id?: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

interface QueryResult<T> {
  records: T[];
  count: number | null;
}

/** Envelope real devolvido pelo edge function external-db-bridge (ver index.ts). */
interface EdgeFunctionEnvelope {
  success?: boolean;
  error?: string;
  data?: unknown;
}

interface ExternalDatabaseState<T> {
  data: T[];
  count: number | null;
  isLoading: boolean;
  error: string | null;
}

type StateSetter<T> = Dispatch<SetStateAction<ExternalDatabaseState<T>>>;

async function invokeExternalOperation<T extends object>(
  tableName: ExternalTable,
  operation: Operation,
  options?: QueryOptions & { data?: Partial<T> },
): Promise<EdgeFunctionEnvelope> {
  const { data, filters, id, select, orderBy, limit, offset } = options ?? {};
  const { data: rawData, error } = await invokeWithRetry({
    table: tableName,
    operation,
    data,
    filters,
    id,
    select,
    orderBy,
    limit,
    offset,
  });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  const response = rawData as EdgeFunctionEnvelope | null;
  if (!response?.success) throw new Error(response?.error || 'Erro desconhecido');
  return response;
}

function applyExternalSuccess<T extends object>(
  operation: Operation,
  response: EdgeFunctionEnvelope,
  setState: StateSetter<T>,
): T | QueryResult<T> {
  if (operation !== 'select') {
    setState(previous => ({ ...previous, isLoading: false }));
    return response.data as T;
  }
  const result = response.data as QueryResult<T>;
  setState(previous => ({ ...previous, data: result.records, count: result.count, isLoading: false }));
  return result;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

// T extends object (não Record<string, unknown>): interfaces nomeadas (ExternalProduct,
// ExternalCategory etc.) não satisfazem Record<string, unknown> estruturalmente — mesma
// armadilha documentada em supabase-untyped.ts. `object` já basta para excluir primitivos
// do operando direito do `in` (linhas 147/157/174), que é o único motivo da constraint.
export function useExternalDatabase<T extends object = Record<string, unknown>>(tableName: ExternalTable) {
  if (!tableName || typeof tableName !== 'string') {
    console.error(`[useExternalDatabase] Invalid tableName: ${JSON.stringify(tableName)}`);
  }

  const [state, setState] = useState<ExternalDatabaseState<T>>({
    data: [],
    count: null,
    isLoading: false,
    error: null,
  });

  const invoke = useCallback(async (
    operation: Operation,
    options?: QueryOptions & { data?: Partial<T> }
  ): Promise<T | QueryResult<T> | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await invokeExternalOperation<T>(tableName, operation, options);
      return applyExternalSuccess(operation, response, setState);
    } catch (err) {
      const errorMessage = await extractFunctionErrorMessage(err);
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      toast.error(errorMessage);
      return null;
    }
  }, [tableName]);

  const fetchAll = useCallback(async (options?: Omit<QueryOptions, 'id'>) => {
    return invoke('select', options) as Promise<QueryResult<T> | null>;
  }, [invoke]);

  const fetchOne = useCallback(async (id: string, select?: string) => {
    const result = await invoke('select', { id, select, limit: 1 });
    if (result && 'records' in result) {
      return result.records[0] || null;
    }
    return null;
  }, [invoke]);

  const create = useCallback(async (data: Partial<T>) => {
    const result = await invoke('insert', { data });
    if (!result) return null;

    if ('records' in result) {
      const created = result.records[0] || null;
      if (created) {
        toast.success('Registro criado com sucesso!');
        return created as T;
      }
      return null;
    }

    toast.success('Registro criado com sucesso!');
    return result as T;
  }, [invoke]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    const result = await invoke('update', { id, data });
    if (!result) return null;

    if ('records' in result) {
      const updated = result.records[0] || null;
      if (updated) {
        toast.success('Registro atualizado com sucesso!');
        return updated as T;
      }
      return null;
    }

    toast.success('Registro atualizado com sucesso!');
    return result as T;
  }, [invoke]);

  const remove = useCallback(async (id: string) => {
    const result = await invoke('delete', { id });
    if (result) {
      toast.success('Registro excluído com sucesso!');
      return true;
    }
    return false;
  }, [invoke]);

  const refetch = useCallback(async (options?: Omit<QueryOptions, 'id'>) => {
    return fetchAll(options);
  }, [fetchAll]);

  return {
    ...state,
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    refetch,
    invoke,
  };
}

// ============================================
// HOOKS ESPECÍFICOS POR RECURSO
// ============================================

export function useExternalProducts() {
  return useExternalDatabase<ExternalProduct>('products');
}

export function useExternalProductImages() {
  return useExternalDatabase<ExternalProductImage>('product_images');
}

export function useExternalProductVariants() {
  return useExternalDatabase<ExternalProductVariant>('product_variants');
}

export function useExternalCategories() {
  return useExternalDatabase<ExternalCategory>('categories');
}

export function useExternalSuppliers() {
  return useExternalDatabase<ExternalSupplier>('suppliers');
}

export function useExternalSupplierColors() {
  return useExternalDatabase<ExternalSupplierColor>('supplier_colors');
}

export function useExternalSupplierMaterials() {
  return useExternalDatabase<ExternalSupplierMaterial>('supplier_materials');
}

export function useExternalSupplierAttributeDefinitions() {
  return useExternalDatabase<ExternalSupplierAttributeDefinition>('supplier_attribute_definitions');
}

export function useExternalSupplierProductAttributes() {
  return useExternalDatabase<ExternalSupplierProductAttribute>('supplier_product_attributes');
}

export function useExternalProductSuppliers() {
  return useExternalDatabase<ExternalProductSupplier>('product_suppliers');
}

export function useExternalTechniques() {
  return useExternalDatabase<ExternalTechnique>('personalization_techniques');
}

export function useExternalPriceTables() {
  return useExternalDatabase<ExternalPriceTable>('customization_price_tables');
}

export function useExternalCollections() {
  return useExternalDatabase<ExternalCollection>('collections');
}

export function useExternalTags() {
  return useExternalDatabase<ExternalTag>('tags');
}

/**
 * @deprecated 'companies' não existe no external-db-bridge (Promobrind) — nem em
 * PRODUCT_TABLES nem em BRIDGE_ALIASES. Empresas/clientes são servidas pelo CRM
 * externo via crm-db-bridge. Use useCrmCompanies() de '@/hooks/useCrmCompanies'.
 * Mantido com fallback vazio (mesmo padrão de useExternalBusinessSectors) para não
 * quebrar consumidores legados (ex.: ExternalDatabaseTest.tsx).
 */
export function useExternalCompanies() {
  logger.warn("[DEPRECATED] useExternalCompanies() → use useCrmCompanies() from '@/hooks/useCrmCompanies'");
  return {
    data: [] as ExternalCompany[],
    count: null as number | null,
    isLoading: false,
    error: null as string | null,
    fetchAll: async (_options?: Omit<QueryOptions, 'id'>) => null as QueryResult<ExternalCompany> | null,
    fetchOne: async (_id: string, _select?: string) => null as ExternalCompany | null,
    create: async (_data: Partial<ExternalCompany>) => null as ExternalCompany | null,
    update: async (_id: string, _data: Partial<ExternalCompany>) => null as ExternalCompany | null,
    remove: async (_id: string) => false,
    refetch: async (_options?: Omit<QueryOptions, 'id'>) => null as QueryResult<ExternalCompany> | null,
    invoke: async (_operation: Operation, _options?: QueryOptions & { data?: Partial<ExternalCompany> }) =>
      null as ExternalCompany | QueryResult<ExternalCompany> | null,
  };
}

export function useExternalClientContacts() {
  return useExternalDatabase<ExternalClientContact>('client_contacts');
}

export function useExternalOrganizations() {
  return useExternalDatabase<ExternalOrganization>('organizations');
}

export function useExternalRamosAtividade() {
  return useExternalDatabase<ExternalRamoAtividade>('ramo_atividade');
}

export function useExternalRamosAtividadeFilho() {
  return useExternalDatabase<ExternalRamoAtividadeFilho>('ramo_atividade_filho');
}

/**
 * @deprecated business_sectors não está exposta no PostgREST do BD externo (PGRST205).
 * Use useExternalRamosAtividade() para dados de segmentos/público-alvo.
 * Mantido com fallback vazio para evitar quebras em código futuro.
 */
export function useExternalBusinessSectors() {
  return {
    data: [] as ExternalBusinessSector[],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: [] as ExternalBusinessSector[], error: null }),
  };
}

export function useExternalMaterialGroups() {
  return useExternalDatabase<ExternalMaterialGroup>('material_groups');
}

export function useExternalMaterialTypes() {
  return useExternalDatabase<ExternalMaterialType>('material_types');
}

export function useExternalColorGroups() {
  return useExternalDatabase<ExternalColorGroup>('color_groups');
}

export function useExternalColorVariations() {
  return useExternalDatabase<ExternalColorVariation>('color_variations');
}
