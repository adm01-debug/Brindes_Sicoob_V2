/**
 * Indicadores da carteira de clientes, medidos.
 *
 * A tela /clientes exibia três números digitados à mão — "Novos (Mês)" = 12,
 * "Ticket Médio" = R$ 4,2k e "Taxa Retenção" = 94% — sob o comentário
 * "Indicadores mockados para demonstração". Supervisão lia aquilo como medição.
 *
 * O que dá para medir com o dado que o sistema tem hoje:
 *   - quantos clientes distintos fizeram pedido no mês corrente;
 *   - o ticket médio dos pedidos dos últimos 90 dias.
 * Os dois respeitam o escopo de visibilidade do usuário (`applySellerScope`),
 * então vendedor vê a própria carteira e supervisão vê o time.
 *
 * O que NÃO dá, e por isso saiu da tela em vez de virar número inventado:
 *   - "novos clientes no mês" exige a data de cadastro da empresa, que o
 *     contrato fechado do CRM não projeta (QUOTE_COMPANY_SELECT);
 *   - "taxa de retenção" exige uma definição de negócio que não existe no
 *     repositório (janela, o que conta como retido, o que conta como perdido).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesScope, type SalesScope } from '@/lib/auth/visibility-scope';
import { applySellerScope } from '@/lib/auth/apply-seller-scope';
import { logger } from '@/lib/logger';

const TICKET_WINDOW_DAYS = 90;
/** Página do PostgREST. A resposta tem teto de linhas; sem paginar, janela
 *  grande volta cortada e a média sai de uma amostra, sem erro nenhum. */
const PAGE_SIZE = 1000;
/** Teto de segurança: 50 páginas = 50 mil pedidos na janela. */
const MAX_PAGES = 50;

export interface ClientsPortfolioKpis {
  /** Clientes distintos com pedido no mês corrente. */
  clientesComPedidoNoMes: number;
  /** Ticket médio dos pedidos da janela, em reais. Nulo quando não houve pedido. */
  ticketMedio: number | null;
  /** Pedidos considerados no ticket médio. */
  pedidosNaJanela: number;
  /** Dias da janela do ticket médio, para a tela poder rotular. */
  janelaDias: number;
}

function inicioDoMes(agora: Date): string {
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
}

function inicioDaJanela(agora: Date): string {
  return new Date(agora.getTime() - TICKET_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Lê todos os pedidos da janela, uma página por vez.
 *
 * `cancelado` fica de fora, como em `useClientOrdersHistory`: pedido cancelado
 * não é compra, não conta cliente comprador e não entra no ticket. A ordem por
 * `id` torna a paginação determinística.
 */
async function lerPedidos(
  colunas: string,
  desde: string,
  scope: SalesScope,
  userId: string | undefined,
): Promise<Array<{ client_id?: string | null; total?: number | null }>> {
  const linhas: Array<{ client_id?: string | null; total?: number | null }> = [];
  for (let pagina = 0; pagina < MAX_PAGES; pagina += 1) {
    const inicio = pagina * PAGE_SIZE;
    const consulta = applySellerScope(
      supabase
        .from('orders')
        .select(colunas)
        .neq('status', 'cancelado')
        .gte('created_at', desde)
        .order('id', { ascending: true })
        .range(inicio, inicio + PAGE_SIZE - 1),
      { scope, userId },
    );
    const { data, error } = await consulta;
    if (error) throw error;
    const lote = (data ?? []) as Array<{ client_id?: string | null; total?: number | null }>;
    linhas.push(...lote);
    if (lote.length < PAGE_SIZE) return linhas;
  }
  logger.warn(
    `[clientes-kpi] janela com mais de ${MAX_PAGES * PAGE_SIZE} pedidos; indicadores calculados sobre o teto`,
  );
  return linhas;
}

export async function fetchClientsPortfolioKpis(
  scope: SalesScope,
  userId: string | undefined,
  agora = new Date(),
): Promise<ClientsPortfolioKpis> {
  const [doMes, pedidos] = await Promise.all([
    lerPedidos('client_id', inicioDoMes(agora), scope, userId),
    lerPedidos('total', inicioDaJanela(agora), scope, userId),
  ]);

  const clientesNoMes = new Set(doMes.map((pedido) => pedido.client_id).filter(Boolean));
  const receita = pedidos.reduce((soma, pedido) => soma + (pedido.total ?? 0), 0);

  return {
    clientesComPedidoNoMes: clientesNoMes.size,
    ticketMedio: pedidos.length > 0 ? receita / pedidos.length : null,
    pedidosNaJanela: pedidos.length,
    janelaDias: TICKET_WINDOW_DAYS,
  };
}

export function useClientsPortfolioKpis() {
  const { user } = useAuth();
  const scope = useSalesScope();

  return useQuery<ClientsPortfolioKpis>({
    queryKey: ['clients-portfolio-kpis', scope, user?.id],
    queryFn: () => fetchClientsPortfolioKpis(scope, user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
