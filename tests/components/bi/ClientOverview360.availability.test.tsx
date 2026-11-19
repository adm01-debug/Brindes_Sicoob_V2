import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useClientBIMock } = vi.hoisted(() => ({ useClientBIMock: vi.fn() }));

vi.mock('@/hooks/bi/useClientBI', () => ({ useClientBI: useClientBIMock }));

import { ClientOverview360 } from '@/components/bi/ClientOverview360';

describe('disponibilidade do histórico no resumo 360°', () => {
  beforeEach(() => {
    useClientBIMock.mockReset().mockReturnValue({
      isMock: false,
      hasData: false,
      isUnavailable: true,
      ltv: 0,
      avgTicket: 0,
      ordersCount: 0,
      lastOrderDate: null,
      daysSinceLastOrder: null,
      current90d: { ltv: 0, avgTicket: 0, ordersCount: 0 },
      previous90d: { ltv: 0, avgTicket: 0, ordersCount: 0 },
      delta: { ltvDeltaPct: 0, avgTicketDeltaPct: 0, ordersCountDeltaPct: 0, hasPreviousData: false },
      isLoading: false,
    });
  });

  it('não apresenta zeros ou “nunca comprou” como se fossem dados reais após falha do histórico', () => {
    render(<ClientOverview360 clientId="cliente-1" />);

    expect(screen.getAllByText('Histórico indisponível')).toHaveLength(4);
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.queryByText(/R\$\s*0/)).toBeNull();
    expect(screen.queryByText('Nunca comprou')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Comparar período' }).hasAttribute('disabled')).toBe(true);
  });
});
