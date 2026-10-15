/**
 * Hook para acessar empresas/clientes do CRM externo
 * Substitui useClients (que usava bitrix_clients)
 */

import { useQuery } from "@tanstack/react-query";
import { selectCrm, selectCrmById, searchCrm } from "@/lib/crm-db";
import { type CrmCompany, type CrmCompanyFilters, type CrmCustomer, toLegacyClient, getCompanyDisplayName } from "@/types/crm";
import {  DEMO_COMPANY, isDemoClient } from "@/lib/bi/demoClient";

function setDefinedFilter(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value !== undefined && value !== null && value !== '') target[key] = value;
}

function buildCompanyFilters(filters?: CrmCompanyFilters): Record<string, unknown> {
  const result: Record<string, unknown> = { deleted_at: null };
  setDefinedFilter(result, 'status', filters?.status);
  setDefinedFilter(result, 'cidade', filters?.cidade);
  setDefinedFilter(result, 'estado', filters?.estado);
  setDefinedFilter(result, 'ramo_atividade', filters?.ramo_atividade);
  setDefinedFilter(result, 'is_customer', filters?.is_customer);
  setDefinedFilter(result, 'is_supplier', filters?.is_supplier);
  setDefinedFilter(result, 'is_carrier', filters?.is_carrier);
  return result;
}

/**
 * Lista empresas do CRM com filtros opcionais
 */
export function useCrmCompanies(filters?: CrmCompanyFilters) {
  return useQuery<CrmCompany[]>({
    queryKey: ["crm-companies", filters],
    queryFn: async () => {
      const queryFilters = buildCompanyFilters(filters);

      if (filters?.search) {
        return searchCrm<CrmCompany>("companies", "razao_social", filters.search, {
          orderBy: { column: "razao_social", ascending: true },
          limit: 200,
        });
      }

      return selectCrm<CrmCompany>("companies", {
        filters: Object.keys(queryFilters).length > 0 ? queryFilters : undefined,
        orderBy: { column: "razao_social", ascending: true },
        limit: 200,
      });
    },
    staleTime: 10 * 60 * 1000,
  });
}

const CLIENTS_PAGE_SIZE = 1000;
const CLIENTS_MAX_RECORDS = 10_000;

async function fetchAllCrmCompanies(filters: Omit<CrmCompanyFilters, "search">): Promise<CrmCompany[]> {
  const queryFilters = buildCompanyFilters(filters);
  const companies: CrmCompany[] = [];

  for (let offset = 0; offset <= CLIENTS_MAX_RECORDS; offset += CLIENTS_PAGE_SIZE) {
    const limit = offset === CLIENTS_MAX_RECORDS ? 1 : CLIENTS_PAGE_SIZE;
    const page = await selectCrm<CrmCompany>("companies", {
      filters: queryFilters,
      orderBy: { column: "id", ascending: true },
      limit,
      offset,
    });
    if (offset === CLIENTS_MAX_RECORDS) {
      if (page.length > 0) {
        throw new Error("A base de clientes excede 10.000 registros; a consulta foi interrompida para não exibir totais parciais.");
      }
      return companies;
    }
    if (page.length < CLIENTS_PAGE_SIZE) return [...companies, ...page];
    companies.push(...page);
  }

  return companies;
}

/** Lista completa e estável para telas que apresentam totais da base. */
export function useAllCrmCompanies(filters: Omit<CrmCompanyFilters, "search">) {
  return useQuery<CrmCompany[]>({
    queryKey: ["crm-companies-all", filters],
    queryFn: () => fetchAllCrmCompanies(filters),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca empresa individual do CRM por ID
 */
export function useCrmCompany(id: string | null | undefined) {
  return useQuery<CrmCompany | null>({
    queryKey: ["crm-company", id],
    queryFn: async () => {
      if (!id) return null;
      if (isDemoClient(id)) return DEMO_COMPANY as unknown as CrmCompany;
      return selectCrmById<CrmCompany>("companies", id);
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook de compatibilidade: retorna dados no formato legado (BitrixClient)
 */
export function useCrmCompaniesLegacy(filters?: CrmCompanyFilters) {
  const query = useCrmCompanies(filters);

  return {
    ...query,
    data: query.data?.map(c => toLegacyClient(c)) || [],
  };
}

/**
 * Hook de compatibilidade: empresa individual no formato legado
 */
export function useCrmCompanyLegacy(id: string | null | undefined) {
  const query = useCrmCompany(id);

  return {
    ...query,
    data: query.data ? toLegacyClient(query.data) : null,
  };
}

/**
 * Busca lista de empresas para seletores (dropdown/combobox)
 * Retorna apenas campos essenciais para performance
 */
export interface CrmSelectorResult {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo: string | null;
  nicho: string | null;
  primary_color_name: string | null;
  primary_color_hex: string | null;
  logo_url: string | null;
  cnpj: string | null;
}

export function useCrmCompanySelector() {
  return useQuery<CrmSelectorResult[]>({
    queryKey: ["crm-companies-selector"],
    queryFn: async () => {
      const companies = await selectCrm<CrmCompany>("companies", {
        select: "id, razao_social, nome_fantasia, title, ramo_atividade, logo_url, cnpj, is_customer, is_supplier",
        filters: { deleted_at: null },
        orderBy: { column: "razao_social", ascending: true },
        limit: 200,
      });

      return companies.map((c) => ({
        id: c.id,
        name: getCompanyDisplayName(c),
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        ramo: c.ramo_atividade,
        nicho: null,
        primary_color_name: null,
        primary_color_hex: null,
        logo_url: c.logo_url,
        cnpj: c.cnpj,
      }));
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook para dados de customer associado a uma company
 */
export function useCrmCustomer(companyId: string | null | undefined) {
  return useQuery<CrmCustomer | null>({
    queryKey: ["crm-customer", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const results = await selectCrm<CrmCustomer>("customers", {
        filters: { company_id: companyId },
        limit: 1,
      });
      return results[0] || null;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
}
