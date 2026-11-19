import { describe, expect, it } from 'vitest';
import { buildBriefingHistoryDetail } from '@/components/bi/BIBriefingMode';

describe('histórico apresentado no briefing', () => {
  it('não afirma valores ou ausência de compras quando a consulta falhou', () => {
    expect(buildBriefingHistoryDetail({ isUnavailable: true } as never)).toMatch(/Histórico indisponível/);
    expect(buildBriefingHistoryDetail({ isUnavailable: true } as never)).not.toMatch(/R\$|pedidos/);
  });

  it('continua distinguindo histórico confirmado sem pedidos de consulta indisponível', () => {
    const detail = buildBriefingHistoryDetail({
      isUnavailable: false,
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
    } as never);

    expect(detail).toMatch(/R\$\s*0/);
    expect(detail).toContain('0 pedidos');
  });
});
