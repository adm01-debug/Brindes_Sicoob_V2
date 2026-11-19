import { fetchQuoteDirectoryCompanies, type QuoteDirectoryCompany } from '@/lib/crm-db';

export interface CartCompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo: string | null;
  logo_url: string | null;
}

/**
 * Teto por página do contrato fechado: `isQuoteDirectoryRequest` nega
 * `limit > 100` (supabase/functions/_shared/portal-access-policy.ts:99), e essa
 * negação é anterior à checagem de papel — um valor maior devolveria 403 até
 * para `dev`. O `offset` aceito vai até 10.000, ou seja 100 páginas.
 */
const PAGE_SIZE = 100;

/**
 * Empresas do carrinho vêm pelo contrato fechado `quote_directory`, o único que
 * a política de acesso do portal libera para `vendedor` e `agente`. O `select`
 * genérico passou a ser negado para esses papéis; manter `selectCrm` aqui
 * deixaria o seletor de empresa do carrinho vazio e impediria esses usuários de
 * criar carrinho. O Edge já aplica `is_customer = true`, `deleted_at is null` e
 * a projeção, então o cliente só pagina.
 */
async function fetchQuoteDirectoryCustomers(): Promise<QuoteDirectoryCompany[]> {
  const rows: QuoteDirectoryCompany[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchQuoteDirectoryCompanies({ limit: PAGE_SIZE, offset });
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/**
 * O orçamento usa o ID da empresa no CRM externo. O carrinho preserva esse
 * mesmo identificador para que empresa e contatos sejam resolvidos ao gerar a
 * proposta. A paginação evita ocultar clientes além do primeiro lote.
 */
export async function fetchCartCompanyOptions(): Promise<CartCompanyOption[]> {
  const companies = await fetchQuoteDirectoryCustomers();
  return companies
    .map((company) => ({
      id: company.id,
      name: company.name,
      razao_social: company.razao_social,
      nome_fantasia: company.nome_fantasia || null,
      ramo: company.ramo_atividade || null,
      logo_url: company.logo_url || null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}
