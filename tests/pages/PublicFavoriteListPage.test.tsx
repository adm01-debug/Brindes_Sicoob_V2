import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ token: 'token-publico' }) };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/hooks/useFavoriteReactions', () => ({
  useFavoriteReactions: () => ({
    reactions: [],
    anonId: 'visitante-1',
    react: { isPending: false, mutate: vi.fn() },
  }),
}));

vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));

import PublicFavoriteListPage from '@/pages/PublicFavoriteListPage';

describe('PublicFavoriteListPage', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it('herda o retry do QueryClient e recupera uma falha transitória da lista pública', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: new Error('falha transitória') })
      .mockResolvedValueOnce({
        data: {
          list: {
            id: 'lista-1',
            name: 'Seleção recuperada',
            description: null,
            color: '#003641',
            shared_expires_at: null,
          },
          items: [],
        },
        error: null,
      });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PublicFavoriteListPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Seleção recuperada' })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
});
