import { selectCrm } from '@/lib/crm-db';
import { supabase } from '@/integrations/supabase/client';
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

type SicoobUnitRow = {
  id: string;
  nome: string;
  codigo: string;
  cidade: string | null;
  uf: string | null;
};

function locationLabel(prefix: string, row: SicoobUnitRow): string {
  const location = [row.cidade, row.uf].filter(Boolean).join('/');
  return [`${prefix} ${row.codigo}`, location].filter(Boolean).join(' • ');
}

async function fetchCanonicalSicoobUnits(): Promise<CartCompanyOption[]> {
  const [cooperativasResult, postosResult] = await Promise.all([
    supabase
      .from('cooperativas')
      .select('id, nome, codigo, cidade, uf')
      .eq('is_active', true),
    supabase
      .from('postos_atendimento')
      .select('id, nome, codigo, cidade, uf')
      .eq('is_active', true),
  ]);

  const cooperativas = cooperativasResult.error
    ? []
    : (cooperativasResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.nome,
        razao_social: row.nome,
        nome_fantasia: row.nome,
        ramo: locationLabel('Cooperativa', row),
        logo_url: null,
      }));
  const postos = postosResult.error
    ? []
    : (postosResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.nome,
        razao_social: row.nome,
        nome_fantasia: row.nome,
        ramo: locationLabel('PA', row),
        logo_url: null,
      }));

  return [...cooperativas, ...postos];
}

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
  // A associação de orçamento do portal Sicoob pertence ao banco operacional
  // canônico. O CRM legado continua apenas como fallback de compatibilidade
  // para ambientes que ainda não possuem cooperativas/PAs cadastrados.
  const sicoobUnits = await fetchCanonicalSicoobUnits();
  if (sicoobUnits.length > 0) {
    return sicoobUnits.sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }

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
