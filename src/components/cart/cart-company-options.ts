import { listQuoteDirectoryCompanies } from '@/lib/crm-db';

export interface CartCompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo: string | null;
  logo_url: string | null;
}

export function buildCartCompanyAccessScope(userId: string | undefined, roles: readonly string[] | undefined): string {
  return `${userId ?? "anon"}:${[...(roles ?? [])].sort().join(",")}`;
}

/**
 * O orçamento usa o ID da empresa no CRM externo. O carrinho preserva esse
 * mesmo identificador para que empresa e contatos sejam resolvidos ao gerar a
 * proposta. A paginação evita ocultar clientes além do primeiro lote.
 */
export async function fetchCartCompanyOptions(term?: string): Promise<CartCompanyOption[]> {
  const companies = await listQuoteDirectoryCompanies({
    limit: 100,
    ...(term && term.trim().length >= 2 ? { term: term.trim() } : {}),
  });
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
