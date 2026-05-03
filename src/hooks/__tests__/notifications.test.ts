import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUpdateOrder } from '../useOrders';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user123', email: 'user@example.com' } } })),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user123', email: 'user@example.com' },
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useMutation: vi.fn((opts) => ({
    mutate: (vars: any) => opts.mutationFn(vars).then(opts.onSuccess),
  })),
}));

describe('Notifications & Preferences', () => {
  it('should trigger email and in-app notifications on status change', async () => {
    const { result } = renderHook(() => useUpdateOrder('order-123', 'rascunho'));
    
    await act(async () => {
      await result.current.mutate({ status: 'enviado_gestor' });
    });
    
    // Check if email function was called
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-transactional-email', expect.any(Object));
    
    // Check if in-app notification was created
    expect(supabase.from).toHaveBeenCalledWith('notifications');
  });
});
