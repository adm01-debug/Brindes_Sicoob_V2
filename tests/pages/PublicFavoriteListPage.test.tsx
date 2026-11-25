import { QueryClientProvider } from '@tanstack/react-query';
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

import { createQueryClient } from '@/lib/query-config';
import PublicFavoriteListPage from '@/pages/PublicFavoriteListPage';

/**
 * Cliente de producao: `retry`/`retryDelay` vem de src/lib/query-config.ts.
 * So o atraso e zerado, para o teste nao esperar 1s/2s entre as tentativas.
 */
function renderWithProductionPolicy() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PublicFavoriteListPage />
    </QueryClientProvider>,
  );
}

const LISTA = {
  id: 'lista-1',
  name: 'Seleção recuperada',
  description: null,
  color: '#003641',
  shared_expires_at: null,
};

describe('PublicFavoriteListPage', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it('regete falha transitoria e mostra a lista quando o link publico responde', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: new Error('503 Service Unavailable') })
      .mockResolvedValueOnce({ data: { list: LISTA, items: [] }, error: null });

    renderWithProductionPolicy();

    expect(
      await screen.findByRole('heading', { name: 'Seleção recuperada' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it('nao regete erro 4xx deterministico: uma chamada e a tela de erro', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('404 lista nao encontrada') });

    renderWithProductionPolicy();

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a lista');
    // Espera alem de qualquer retry para provar que nenhuma tentativa extra ocorreu.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('erro sem codigo conhecido segue o fallback da politica (2 reentregas)', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('respuesta invalida') });

    renderWithProductionPolicy();

    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
  });
});
