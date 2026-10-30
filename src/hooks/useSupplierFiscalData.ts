/**
 * Hook to fetch fiscal data from variant_supplier_sources + supplier_branches
 * for a given product's preferred supplier source.
 * 
 * INHERITANCE: If no VSS record exists, falls back to supplier_branches defaults.
 * OVERRIDE: saveFiscalOverride() creates/updates VSS records to override inherited data.
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import { logger } from '@/lib/logger';

export interface SupplierFiscalData {
  // From variant_supplier_sources
  cst: string | null;
  cfop: string | null;
  cfop_interstate: string | null;
  icms_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  cest: string | null;
  csosn: string | null;
  operation_nature: string | null;
  supplier_branch_id: string | null;
  // From supplier_branches (joined or fetched separately)
  branch_name: string | null;
  branch_cnpj: string | null;
  branch_state_uf: string | null;
  branch_tax_regime: string | null;
  branch_icms_internal: number | null;
  branch_icms_interstate: number | null;
  // Inheritance flag
  isInherited: boolean;
  // Internal: variant ID used for VSS (needed for save)
  _variantId?: string;
}

export interface FiscalOverrideInput {
  cst: string | null;
  cfop: string | null;
  icms_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  cest: string | null;
  csosn: string | null;
  operation_nature: string | null;
}

interface VSSRecord {
  id?: string;
  cst: string | null;
  cfop: string | null;
  icms_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  cest: string | null;
  csosn: string | null;
  operation_nature: string | null;
  supplier_branch_id: string | null;
  variant_id?: string;
}

interface BranchRecord {
  id: string;
  branch_name: string | null;
  cnpj: string | null;
  state_uf: string | null;
  tax_regime: string | null;
  icms_internal_rate: number | null;
  icms_interstate_rate: number | null;
  default_cst: string | null;
  default_cfop_internal: string | null;
  default_cfop_interstate: string | null;
  default_pis_rate: number | null;
  default_cofins_rate: number | null;
  default_cest: string | null;
  default_csosn: string | null;
  default_operation_nature: string | null;
}

const BRANCH_SELECT = 'id, branch_name, cnpj, state_uf, tax_regime, icms_internal_rate, icms_interstate_rate, default_cst, default_cfop_internal, default_cfop_interstate, default_pis_rate, default_cofins_rate, default_cest, default_csosn, default_operation_nature';

function truthyOrNull<T>(value: T | null | undefined | false | '' | 0): T | null {
  return value ? value as T : null;
}

function definedOrNull<T>(value: T | null | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Builds SupplierFiscalData from branch defaults (inheritance mode).
 */
function buildFromBranch(branch: BranchRecord): SupplierFiscalData {
  return {
    cst: truthyOrNull(branch.default_cst),
    cfop: truthyOrNull(branch.default_cfop_internal),
    cfop_interstate: truthyOrNull(branch.default_cfop_interstate),
    icms_rate: definedOrNull(branch.icms_internal_rate),
    pis_rate: definedOrNull(branch.default_pis_rate),
    cofins_rate: definedOrNull(branch.default_cofins_rate),
    cest: truthyOrNull(branch.default_cest),
    csosn: truthyOrNull(branch.default_csosn),
    operation_nature: truthyOrNull(branch.default_operation_nature),
    supplier_branch_id: branch.id,
    branch_name: truthyOrNull(branch.branch_name),
    branch_cnpj: truthyOrNull(branch.cnpj),
    branch_state_uf: truthyOrNull(branch.state_uf),
    branch_tax_regime: truthyOrNull(branch.tax_regime),
    branch_icms_internal: definedOrNull(branch.icms_internal_rate),
    branch_icms_interstate: definedOrNull(branch.icms_interstate_rate),
    isInherited: true,
  };
}

interface LocatedVss {
  record: VSSRecord | null;
  variantId: string | null;
}

async function locateVss(productId: string, supplierId: string): Promise<LocatedVss> {
  const variantsResult = await invokeExternalDb<{ id: string }>({
    table: 'product_variants',
    operation: 'select',
    select: 'id',
    filters: { product_id: productId },
    limit: 200,
  });
  const variants = variantsResult.records ?? [];
  for (const variant of variants.slice(0, 5)) {
    const result = await invokeExternalDb<VSSRecord>({
      table: 'variant_supplier_sources',
      operation: 'select',
      select: 'id, cst, cfop, icms_rate, pis_rate, cofins_rate, cest, csosn, operation_nature, supplier_branch_id, variant_id',
      filters: { supplier_id: supplierId, variant_id: variant.id },
      limit: 1,
    });
    const record = result.records?.[0];
    if (record) return { record, variantId: variant.id };
  }
  return { record: null, variantId: variants[0]?.id ?? null };
}

async function fetchBranch(branchId: string | null): Promise<Partial<BranchRecord>> {
  if (!branchId) return {};
  try {
    const result = await invokeExternalDb<BranchRecord>({
      table: 'supplier_branches',
      operation: 'select',
      select: BRANCH_SELECT,
      filters: { id: branchId },
      limit: 1,
    });
    return result.records?.[0] ?? {};
  } catch (error) {
    logger.warn('[useSupplierFiscalData] Failed to fetch branch data:', error);
    return {};
  }
}

function buildFromVss(
  vss: VSSRecord,
  branch: Partial<BranchRecord>,
  variantId: string | null,
): SupplierFiscalData {
  return {
    cst: vss.cst,
    cfop: vss.cfop,
    cfop_interstate: null,
    icms_rate: vss.icms_rate,
    pis_rate: vss.pis_rate,
    cofins_rate: vss.cofins_rate,
    cest: vss.cest,
    csosn: vss.csosn,
    operation_nature: vss.operation_nature,
    supplier_branch_id: vss.supplier_branch_id,
    branch_name: truthyOrNull(branch.branch_name),
    branch_cnpj: truthyOrNull(branch.cnpj),
    branch_state_uf: truthyOrNull(branch.state_uf),
    branch_tax_regime: truthyOrNull(branch.tax_regime),
    branch_icms_internal: definedOrNull(branch.icms_internal_rate),
    branch_icms_interstate: definedOrNull(branch.icms_interstate_rate),
    isInherited: false,
    _variantId: variantId ?? undefined,
  };
}

async function fetchInheritedFiscalData(
  supplierId: string,
  variantId: string | null,
): Promise<SupplierFiscalData | null> {
  try {
    const result = await invokeExternalDb<BranchRecord>({
      table: 'supplier_branches',
      operation: 'select',
      select: BRANCH_SELECT,
      filters: { supplier_id: supplierId, is_active: true },
      limit: 5,
    });
    const branch = result.records?.[0];
    if (!branch) return null;
    return { ...buildFromBranch(branch), _variantId: variantId ?? undefined };
  } catch (error) {
    logger.warn('[useSupplierFiscalData] Failed to fetch branch defaults for inheritance:', error);
    return null;
  }
}

async function fetchSupplierFiscalData(
  productId: string | undefined,
  supplierId: string | undefined,
): Promise<SupplierFiscalData | null> {
  if (!productId || !supplierId) return null;
  const located = await locateVss(productId, supplierId);
  if (!located.record) return fetchInheritedFiscalData(supplierId, located.variantId);
  const branch = await fetchBranch(located.record.supplier_branch_id);
  return buildFromVss(located.record, branch, located.variantId);
}

async function createDefaultVariant(productId: string): Promise<string | undefined> {
  try {
    const result = await invokeExternalDb<{ id: string }>({
      table: 'product_variants',
      operation: 'insert',
      data: {
        product_id: productId,
        sku: `DEFAULT-${productId.substring(0, 8)}`,
        is_active: true,
        attributes: {},
      },
    });
    const createdId = result.records?.[0]?.id;
    if (createdId) return createdId;
    return (result as Record<string, unknown>).id as string | undefined;
  } catch (error) {
    console.error('[saveFiscalOverride] Failed to create default variant:', error);
    return undefined;
  }
}

async function supplierOrganizationId(supplierId: string): Promise<string | null> {
  try {
    const result = await invokeExternalDb<{ organization_id: string }>({
      table: 'variant_supplier_sources',
      operation: 'select',
      select: 'organization_id',
      filters: { supplier_id: supplierId },
      limit: 1,
    });
    return result.records?.[0]?.organization_id ?? null;
  } catch (error) {
    logger.warn('[saveFiscalOverride] Could not fetch org_id from existing VSS:', error);
    return null;
  }
}

function fiscalPayload(input: FiscalOverrideInput) {
  return {
    cst: truthyOrNull(input.cst),
    cfop: truthyOrNull(input.cfop),
    icms_rate: input.icms_rate,
    pis_rate: input.pis_rate,
    cofins_rate: input.cofins_rate,
    cest: truthyOrNull(input.cest),
    csosn: truthyOrNull(input.csosn),
    operation_nature: truthyOrNull(input.operation_nature),
  };
}

interface SaveFiscalParams {
  input: FiscalOverrideInput;
  productId: string;
  supplierId: string;
  currentData: SupplierFiscalData | null | undefined;
}

async function persistFiscalOverride({
  input,
  productId,
  supplierId,
  currentData,
}: SaveFiscalParams): Promise<boolean> {
  const variantId = currentData?._variantId ?? await createDefaultVariant(productId);
  if (!variantId) return false;

  const existingResult = await invokeExternalDb<{ id: string }>({
    table: 'variant_supplier_sources',
    operation: 'select',
    select: 'id',
    filters: { supplier_id: supplierId, variant_id: variantId },
    limit: 1,
  });
  const existingRecord = existingResult.records?.[0];
  const payload = fiscalPayload(input);
  if (existingRecord) {
    await invokeExternalDb({
      table: 'variant_supplier_sources',
      operation: 'update',
      id: existingRecord.id,
      data: payload,
    });
    return true;
  }

  const organizationId = await supplierOrganizationId(supplierId);
  await invokeExternalDb({
    table: 'variant_supplier_sources',
    operation: 'insert',
    data: {
      ...payload,
      supplier_id: supplierId,
      variant_id: variantId,
      supplier_branch_id: currentData?.supplier_branch_id || null,
      ...(organizationId ? { organization_id: organizationId } : {}),
    },
  });
  return true;
}

/**
 * Fetches fiscal data for a specific supplier source (by supplier_id + product variants).
 * Uses the external DB bridge to query variant_supplier_sources.
 * 
 * INHERITANCE: If no VSS record exists for the product+supplier combo,
 * falls back to supplier_branches defaults for that supplier.
 */
export function useSupplierFiscalData(productId: string | undefined, supplierId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['supplier-fiscal-data', productId, supplierId], [productId, supplierId]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchSupplierFiscalData(productId, supplierId),
    enabled: !!productId && !!supplierId,
    staleTime: 5 * 60 * 1000,
  });

  /**
   * Save fiscal override: creates or updates a variant_supplier_sources record.
   */
  const saveFiscalOverride = useCallback(async (input: FiscalOverrideInput): Promise<boolean> => {
    if (!productId || !supplierId) return false;

    try {
      const saved = await persistFiscalOverride({ input, productId, supplierId, currentData: query.data });
      if (!saved) return false;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (err) {
      console.error('[saveFiscalOverride] Failed to save fiscal override:', err);
      return false;
    }
  }, [productId, supplierId, query.data, queryClient, queryKey]);

  /**
   * Revert to inherited: deletes the VSS record so data falls back to branch defaults.
   */
  const revertToInherited = useCallback(async (): Promise<boolean> => {
    if (!productId || !supplierId) return false;
    const currentData = query.data;
    if (!currentData || currentData.isInherited) return false;

    try {
      const variantId = currentData._variantId;
      if (!variantId) return false;

      const vssResult = await invokeExternalDb<{ id: string }>({
        table: 'variant_supplier_sources',
        operation: 'select',
        select: 'id',
        filters: { supplier_id: supplierId, variant_id: variantId },
        limit: 1,
      });

      const vssRecord = vssResult.records?.[0];
      if (vssRecord) {
        await invokeExternalDb({
          table: 'variant_supplier_sources',
          operation: 'delete',
          id: vssRecord.id,
        });
      }

      await queryClient.invalidateQueries({ queryKey });
      return true;
    } catch (err) {
      console.error('[revertToInherited] Failed:', err);
      return false;
    }
  }, [productId, supplierId, query.data, queryClient, queryKey]);

  return { ...query, saveFiscalOverride, revertToInherited };
}
