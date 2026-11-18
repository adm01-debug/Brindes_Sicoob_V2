/**
 * Indicadores da carteira de clientes, medidos.
 *
 * A tela /clientes exibia três números digitados à mão — "Novos (Mês)" = 12,
 * "Ticket Médio" = R$ 4,2k e "Taxa Retenção" = 94% — sob o comentário
 * "Indicadores mockados para demonstração". Supervisão lia aquilo como medição.
 *
 * Os quatro indicadores de hoje saem todos de `orders`, com o escopo de
 * visibilidade do usuário (`applySellerScope`): vendedor vê a própria carteira,
 * supervisão vê o time. Pedido cancelado não conta em nenhum deles.
 *
 * As duas definições de negócio que faltavam, agora escritas e verificáveis:
 *
 *   - **primeira compra no mês**: cliente cujo primeiro pedido de todos é deste
 *     mês. Não é "cadastro novo" — a data de cadastro vive no CRM externo e o
 *     contrato fechado não a projeta — é o que importa para venda: cliente que
 *     comprou pela primeira vez.
 *   - **retenção**: dos clientes que compraram na janela anterior
 *     (de 180 a 90 dias atrás), quantos voltaram a comprar na janela atual
 *     (últimos 90 dias). Sem clientes na janela anterior não há taxa, e o
 *     indicador mostra "—" em vez de 0% ou 100%.
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
  /** Clientes cujo primeiro pedido de todos caiu no mês corrente. */
  primeiraCompraNoMes: number;
  /** Ticket médio dos pedidos da janela, em reais. Nulo quando não houve pedido. */
  ticketMedio: number | null;
  /** Pedidos considerados no ticket médio. */
  pedidosNaJanela: number;
  /** Dias da janela do ticket médio, para a tela poder rotular. */
  janelaDias: number;
  /** 0..100. Nulo quando não houve cliente comprando na janela anterior. */
  retencaoPercentual: number | null;
  /** Clientes da janela anterior, denominador da retenção. */
  clientesJanelaAnterior: number;
}

function inicioDoMes(agora: Date): string {
  return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
}

function inicioDaJanela(agora: Date): string {
  return new Date(agora.getTime() - TICKET_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function inicioDaJanelaAnterior(agora: Date): string {
  return new Date(agora.getTime() - 2 * TICKET_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function clientesDe(linhas: Array<{ client_id?: string | null }>): Set<string> {
  const ids = new Set<string>();
  for (const linha of linhas) {
    if (linha.client_id) ids.add(linha.client_id);
  }
  return ids;
}

function percentualDeRetencao(anteriores: Set<string>, atuais: Set<string>): number | null {
  if (anteriores.size === 0) return null;
  let voltaram = 0;
  anteriores.forEach((id) => {
    if (atuais.has(id)) voltaram += 1;
  });
  return Math.round((voltaram / anteriores.size) * 100);
}

/**
 * Lê todos os pedidos da janela, uma página por vez.
 *
 * `cancelado` fica de fora, como em `useClientOrdersHistory`: pedido cancelado
 * não é compra, não conta cliente comprador e não entra no ticket. A ordem por
 * `id` torna a paginação determinística.
 */
interface JanelaDePedidos {
  colunas: string;
  desde: string;
  /** Limite superior exclusivo, para ler uma janela fechada. */
  ate?: string;
  scope: SalesScope;
  userId: string | undefined;
}

async function lerPedidos(
  janela: JanelaDePedidos,
): Promise<Array<{ client_id?: string | null; total?: number | null }>> {
  const { colunas, desde, ate, scope, userId } = janela;
  const linhas: Array<{ client_id?: string | null; total?: number | null }> = [];
  for (let pagina = 0; pagina < MAX_PAGES; pagina += 1) {
    const inicio = pagina * PAGE_SIZE;
    const base = supabase
      .from('orders')
      .select(colunas)
      .neq('status', 'cancelado')
      .gte('created_at', desde);
    const comTeto = ate ? base.lt('created_at', ate) : base;
    const consulta = applySellerScope(
      comTeto.order('id', { ascending: true }).range(inicio, inicio + PAGE_SIZE - 1),
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

/**
 * Dos clientes que compraram no mês, quais já compravam antes.
 *
 * Pergunta estreita de propósito: em vez de varrer o histórico inteiro, procura
 * pedido anterior ao mês apenas para os clientes que apareceram agora. Em lotes,
 * porque a lista entra na URL.
 */
async function clientesComHistoricoAnterior(
  clientes: string[],
  antesDe: string,
  scope: SalesScope,
  userId: string | undefined,
): Promise<Set<string>> {
  const antigos = new Set<string>();
  for (let inicio = 0; inicio < clientes.length; inicio += 100) {
    const lote = clientes.slice(inicio, inicio + 100);
    if (lote.length === 0) break;
    const { data, error } = await applySellerScope(
      supabase
        .from('orders')
        .select('client_id')
        .neq('status', 'cancelado')
        .lt('created_at', antesDe)
        .in('client_id', lote),
      { scope, userId },
    );
    if (error) throw error;
    clientesDe((data ?? []) as Array<{ client_id?: string | null }>).forEach((id) => antigos.add(id));
  }
  return antigos;
}

export async function fetchClientsPortfolioKpis(
  scope: SalesScope,
  userId: string | undefined,
  agora = new Date(),
): Promise<ClientsPortfolioKpis> {
  const comecoDoMes = inicioDoMes(agora);
  const [doMes, pedidos, daJanelaAnterior] = await Promise.all([
    lerPedidos({ colunas: 'client_id', desde: comecoDoMes, scope, userId }),
    // Uma consulta só para o ticket e para a retenção da janela atual.
    lerPedidos({ colunas: 'client_id, total', desde: inicioDaJanela(agora), scope, userId }),
    lerPedidos({
      colunas: 'client_id',
      desde: inicioDaJanelaAnterior(agora),
      ate: inicioDaJanela(agora),
      scope,
      userId,
    }),
  ]);

  const clientesNoMes = clientesDe(doMes);
  const antigos = await clientesComHistoricoAnterior(
    [...clientesNoMes],
    comecoDoMes,
    scope,
    userId,
  );
  const receita = pedidos.reduce((soma, pedido) => soma + (pedido.total ?? 0), 0);
  const clientesJanelaAtual = clientesDe(pedidos);
  const clientesAnteriores = clientesDe(daJanelaAnterior);

  return {
    clientesComPedidoNoMes: clientesNoMes.size,
    primeiraCompraNoMes: [...clientesNoMes].filter((id) => !antigos.has(id)).length,
    ticketMedio: pedidos.length > 0 ? receita / pedidos.length : null,
    pedidosNaJanela: pedidos.length,
    janelaDias: TICKET_WINDOW_DAYS,
    retencaoPercentual: percentualDeRetencao(clientesAnteriores, clientesJanelaAtual),
    clientesJanelaAnterior: clientesAnteriores.size,
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
