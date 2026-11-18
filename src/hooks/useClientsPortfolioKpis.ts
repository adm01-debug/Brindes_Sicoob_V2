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

const TICKET_WINDOW_DAYS = 90;

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

export async function fetchClientsPortfolioKpis(
  scope: SalesScope,
  userId: string | undefined,
  agora = new Date(),
): Promise<ClientsPortfolioKpis> {
  const [doMes, daJanela] = await Promise.all([
    applySellerScope(
      supabase.from('orders').select('client_id').gte('created_at', inicioDoMes(agora)),
      { scope, userId },
    ),
    applySellerScope(
      supabase.from('orders').select('total').gte('created_at', inicioDaJanela(agora)),
      { scope, userId },
    ),
  ]);
  if (doMes.error) throw doMes.error;
  if (daJanela.error) throw daJanela.error;

  const clientesNoMes = new Set(
    (doMes.data ?? []).map((pedido) => pedido.client_id).filter(Boolean),
  );
  const pedidos = daJanela.data ?? [];
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
