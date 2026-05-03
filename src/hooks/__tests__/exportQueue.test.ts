import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportJobs } from '../useExportJobs';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user123' } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'job123', status: 'pending' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useMutation: vi.fn((opts) => ({
    mutate: (vars) => opts.mutationFn(vars).then(opts.onSuccess),
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe('Export Queue Logic', () => {
  it('should create and retry export jobs correctly', async () => {
    const { result } = renderHook(() => useExportJobs());
    
    await act(async () => {
      await result.current.createJob({ export_type: 'pdf', entity_type: 'orders', filters: {} });
    });
    
    expect(supabase.from).toHaveBeenCalledWith('export_jobs');
    
    await act(async () => {
      await result.current.retryJob('job123');
    });
    
    expect(supabase.from).toHaveBeenCalledWith('export_jobs');
  });
});
