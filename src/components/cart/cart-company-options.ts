import { selectCrm } from '@/lib/crm-db';
import { getCompanyDisplayName, type CrmCompany } from '@/types/crm';

export interface CartCompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo: string | null;
  logo_url: string | null;
}

const PAGE_SIZE = 500;

async function fetchCrmCustomers(): Promise<CrmCompany[]> {
  const rows: CrmCompany[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await selectCrm<CrmCompany>('companies', {
      select: 'id, title, razao_social, nome_fantasia, logo_url, ramo_atividade',
      filters: { deleted_at: null, is_customer: true },
      orderBy: { column: 'id', ascending: true },
      limit: PAGE_SIZE,
      offset,
    });
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
  const companies = await fetchCrmCustomers();
  return companies
    .map((company) => ({
      id: company.id,
      name: getCompanyDisplayName(company),
      razao_social: company.razao_social,
      nome_fantasia: company.nome_fantasia || null,
      ramo: company.ramo_atividade || null,
      logo_url: company.logo_url || null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}
