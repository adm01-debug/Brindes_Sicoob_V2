/**
 * Hook para acessar empresas/clientes do CRM externo
 * Substitui useClients (que usava bitrix_clients)
 */

import { useQuery } from "@tanstack/react-query";
import {
  selectCrm,
  selectCrmById,
  searchCrm,
  fetchQuoteDirectoryCompanies,
  type QuoteDirectoryCompany,
} from "@/lib/crm-db";
import { type CrmCompany, type CrmCompanyFilters, type CrmCustomer, toLegacyClient } from "@/types/crm";
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

/** Teto por pagina do contrato fechado (portal-access-policy.ts:99). */
const DIRECTORY_PAGE = 100;
/** Teto historico destes seletores, preservado para nao mudar o payload. */
const DIRECTORY_CAP = 200;

/**
 * Diretorio de orcamento: unico contrato que a politica do portal libera para
 * `vendedor` e `agente`. O Edge impoe is_customer, deleted_at, a projecao e a
 * ordenacao por razao_social; o cliente so pagina.
 */
async function fetchDirectoryPages(term?: string): Promise<QuoteDirectoryCompany[]> {
  const rows: QuoteDirectoryCompany[] = [];
  for (let offset = 0; rows.length < DIRECTORY_CAP; offset += DIRECTORY_PAGE) {
    const page = await fetchQuoteDirectoryCompanies({ term, limit: DIRECTORY_PAGE, offset });
    rows.push(...page);
    if (page.length < DIRECTORY_PAGE) break;
  }
  return rows.slice(0, DIRECTORY_CAP);
}

function directoryRowToCrmCompany(row: QuoteDirectoryCompany): CrmCompany {
  return {
    id: row.id,
    title: row.name,
    razao_social: row.razao_social,
    nome_fantasia: row.nome_fantasia,
    ramo_atividade: row.ramo_atividade,
    cnpj: row.cnpj,
    logo_url: row.logo_url,
    cidade: row.cidade,
    estado: row.estado,
  } as CrmCompany;
}

/**
 * O contrato fechado nao aceita `filters`: so `is_customer` (imposto pelo Edge) e
 * `term`. Qualquer outro filtro continua no `select` generico, que a politica
 * libera apenas para dev, supervisor, admin e manager.
 */
function fitsQuoteDirectory(filters?: CrmCompanyFilters): boolean {
  if (filters?.is_customer !== true) return false;
  return (
    !filters.status &&
    !filters.cidade &&
    !filters.estado &&
    !filters.ramo_atividade &&
    !filters.is_supplier &&
    !filters.is_carrier
  );
}

/**
 * Lista empresas do CRM com filtros opcionais
 */
export function useCrmCompanies(filters?: CrmCompanyFilters) {
  return useQuery<CrmCompany[]>({
    queryKey: ["crm-companies", filters],
    queryFn: async () => {
      const queryFilters = buildCompanyFilters(filters);

      if (fitsQuoteDirectory(filters)) {
        const rows = await fetchDirectoryPages(filters?.search || undefined);
        return rows.map(directoryRowToCrmCompany);
      }

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

/**
 * Busca empresa individual do CRM por ID
 */
export function useCrmCompany(id: string | null | undefined) {
  return useQuery<CrmCompany | null>({
    queryKey: ["crm-company", id],
    queryFn: async () => {
      if (!id) return null;
      if (isDemoClient(id)) return DEMO_COMPANY as unknown as CrmCompany;
      // `cidade` e `estado` entraram na projecao do contrato fechado, entao a
      // ficha do cliente nao precisa mais do `select` generico, negado para
      // vendedor e agente. BusinessIntelligencePage le esses dois campos.
      const rows = await fetchQuoteDirectoryCompanies({ companyId: id, limit: 1 });
      const [first] = rows;
      if (first) return directoryRowToCrmCompany(first);
      // Empresa fora do contrato (nao cliente): so papeis de supervisao leem.
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
      // Seletor de CLIENTE: o Edge forca is_customer = true, entao fornecedor e
      // transportadora deixam de aparecer aqui. E correcao, mas e visivel.
      const companies = await fetchDirectoryPages();

      return companies.map((c) => ({
        id: c.id,
        name: c.name,
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
