import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke, getSession } = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession },
    functions: { invoke },
  },
}));

import { fetchProductsByCommemorativeDates } from '@/hooks/useCommemorativeDates';

describe('filtro por datas comemorativas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-teste' } } });
  });

  it('consulta cada data uma vez e une produtos sem duplicidade', async () => {
    invoke
      .mockResolvedValueOnce({ data: { success: true, data: [{ product_id: 'produto-a' }, { product_id: 'produto-b' }] }, error: null })
      .mockResolvedValueOnce({ data: { success: true, data: [{ product_id: 'produto-b' }, { product_id: 'produto-c' }] }, error: null });

    await expect(fetchProductsByCommemorativeDates(['natal', 'natal', 'dia-das-maes']))
      .resolves.toEqual(['produto-a', 'produto-b', 'produto-c']);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenCalledWith('commemorative-dates', expect.objectContaining({
      body: expect.objectContaining({ action: 'get_products_by_date' }),
    }));
  });
});
