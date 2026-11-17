import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ loadUnmetDemand: vi.fn() }));

vi.mock('@/components/intelligence/unmet-demand-query', () => ({
  loadUnmetDemand: mocks.loadUnmetDemand,
}));
vi.mock('@/pages/trends/is-demo-mode', () => ({ isDemoMode: () => false }));

import { UnmetDemandCard } from '@/components/intelligence/UnmetDemandCard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadUnmetDemand.mockResolvedValue({ items: [], totalLostSearches: 0 });
});

describe('janela da demanda reprimida', () => {
  it('consulta a partir da meia-noite do primeiro dia civil, como os KPIs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-10-15T15:30:00-03:00'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <UnmetDemandCard days={7} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mocks.loadUnmetDemand).toHaveBeenCalled());
    const since = new Date(mocks.loadUnmetDemand.mock.calls[0]![0] as string);
    expect(since.getHours()).toBe(0);
    expect(since.getMinutes()).toBe(0);
    // Sete dias civis a partir de 15/10 comecam em 09/10, nao em 08/10.
    expect(since.getDate()).toBe(9);
    vi.useRealTimers();
  });
});

