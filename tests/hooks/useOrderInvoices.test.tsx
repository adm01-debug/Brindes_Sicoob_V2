import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  order: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: mocks.order })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({ createSignedUrl: mocks.createSignedUrl })),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useOrderInvoices } from '@/hooks/orders/extensions/useOrderInvoices';

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('notas fiscais privadas do pedido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.mockResolvedValue({
      data: [{
        id: 'nota-1',
        order_id: 'pedido-1',
        invoice_number: 'NF-1',
        file_type: 'pdf',
        file_path: 'pedido-1/invoices/nota.pdf',
        amount: 100,
        access_key: null,
        issued_at: null,
        created_by: 'usuario-1',
        created_at: '2026-09-12T20:00:00.000Z',
      }],
      error: null,
    });
  });

  it('não conserva URL assinada no cache e gera uma URL nova a cada download', async () => {
    mocks.createSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: 'https://arquivo/assinatura-1' }, error: null })
      .mockResolvedValueOnce({ data: { signedUrl: 'https://arquivo/assinatura-2' }, error: null });

    const { result } = renderHook(() => useOrderInvoices('pedido-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.invoices).toHaveLength(1));
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();

    let first = '';
    let second = '';
    await act(async () => {
      first = await result.current.getInvoiceDownloadUrl('pedido-1/invoices/nota.pdf');
      second = await result.current.getInvoiceDownloadUrl('pedido-1/invoices/nota.pdf');
    });

    expect([first, second]).toEqual(['https://arquivo/assinatura-1', 'https://arquivo/assinatura-2']);
    expect(mocks.createSignedUrl).toHaveBeenCalledTimes(2);
    expect(mocks.createSignedUrl).toHaveBeenNthCalledWith(1, 'pedido-1/invoices/nota.pdf', 300);
  });
});
