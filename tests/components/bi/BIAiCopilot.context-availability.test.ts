import { describe, expect, it } from 'vitest';
import {
  buildCopilotHealthContext,
  buildCopilotHistoryContext,
} from '@/components/bi/BIAiCopilot';

describe('contexto do copiloto com dados indisponíveis', () => {
  it('envia métricas nulas quando o histórico falhou, sem converter falha em zero compras', () => {
    expect(buildCopilotHistoryContext({ isUnavailable: true } as never)).toEqual({
      historyAvailable: false,
      ltv: null,
      avgTicket: null,
      ordersCount: null,
      daysSinceLastOrder: null,
    });
  });

  it('preserva zeros quando a consulta confirmou que não existem pedidos', () => {
    expect(buildCopilotHistoryContext({
      isUnavailable: false,
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      daysSinceLastOrder: null,
    } as never)).toEqual({
      historyAvailable: true,
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      daysSinceLastOrder: null,
    });
  });

  it('não envia score ou potencial zerados como diagnóstico quando a amostra é insuficiente', () => {
    expect(buildCopilotHealthContext({
      tier: 'unknown',
      score: 0,
      shareOfWalletPct: 0,
      potentialUntappedBRL: 0,
      crossZoneInsight: 'Dados insuficientes',
      nextActionLabel: 'Dados insuficientes',
      windowLabel: 'Sem janela',
    } as never)).toMatchObject({
      score: null,
      tier: 'unknown',
      shareOfWalletPct: null,
      potentialUntappedBRL: null,
    });
  });
});
