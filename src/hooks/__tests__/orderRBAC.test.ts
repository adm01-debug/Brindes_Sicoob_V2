import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrdersList } from '../useOrders';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          eq: vi.fn((column, value) => {
            if (column === 'seller_id' && value === 'seller-1') {
              return Promise.resolve({ data: [{ id: 'order-1', seller_id: 'seller-1' }], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          })
        }))
      }))
    }))
  }
}));

// Mock Auth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'seller-1' },
    profile: { role: 'vendedor' }
  }))
}));

// Mock Security Logger
vi.mock('@/lib/security/rls-denial-logger', () => ({
  logRlsDenial: vi.fn()
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('Order RBAC Visibility', () => {
  it('Vendedor should only see their own orders when scope is self', async () => {
    const { result } = renderHook(() => useOrdersList('seller-1', 'self'), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].seller_id).toBe('seller-1');
  });

  it('Gestor should see all team orders (mocked behavior)', async () => {
    (supabase.from as any).mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: [
            { id: 'order-1', seller_id: 'seller-1' },
            { id: 'order-2', seller_id: 'seller-2' }
          ], 
          error: null 
        }))
      }))
    }));

    const { result } = renderHook(() => useOrdersList('gestor-1', 'team'), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toHaveLength(2);
  });
});
