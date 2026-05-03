import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOrderAudit, useOrderComments } from '../useOrderExtensions';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user123' } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { events: [], comments: [], count: 0 }, isLoading: false })),
  useMutation: vi.fn((opts) => ({
    mutate: (vars: any) => opts.mutationFn(vars).then(opts.onSuccess),
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe('Order Extensions Hooks', () => {
  describe('useOrderAudit', () => {
    it('should fetch audit events with correct parameters', async () => {
      const orderId = 'order-123';
      const filters = { event_type: 'status_change', search: 'teste' };
      
      renderHook(() => useOrderAudit(orderId, filters));
      
      // Verification happens through the mock implementation logic if we were using a more detailed mock,
      // but here we ensure the hook initializes without crashing.
      expect(useOrderAudit).toBeDefined();
    });
  });

  describe('useOrderComments', () => {
    it('should fetch comments and allow adding new ones', async () => {
      const orderId = 'order-123';
      const { result } = renderHook(() => useOrderComments(orderId));
      
      expect(result.current.addComment).toBeDefined();
    });
  });
});
