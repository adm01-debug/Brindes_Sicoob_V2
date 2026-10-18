import { listQuoteDirectoryCompanies, type QuoteDirectoryCompany } from '@/lib/crm-db';

export interface CartCompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo: string | null;
  logo_url: string | null;
}

const PAGE_SIZE = 100;

async function fetchQuoteDirectoryCustomers(): Promise<QuoteDirectoryCompany[]> {
  const rows: QuoteDirectoryCompany[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await listQuoteDirectoryCompanies({ limit: PAGE_SIZE, offset });
    rows.push(...page);
    if (page.length < PAGE_SIZE || offset >= 10_000) return rows;
  }
}

export function buildCartCompanyAccessScope(userId: string | undefined, roles: readonly string[] | undefined): string {
  return `${userId ?? "anon"}:${[...(roles ?? [])].sort().join(",")}`;
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
