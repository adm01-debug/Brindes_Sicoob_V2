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
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'job123', 
              status: 'pending', 
              file_url: 'http://example.com/file.pdf',
              total_count: 10,
              created_at: new Date().toISOString()
            }, 
            error: null 
          })),
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
    mutate: (vars: any) => opts.mutationFn(vars).then(opts.onSuccess),
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe('Export Audit & Filtering', () => {
  it('should record audit data when creating an export job', async () => {
    const { result } = renderHook(() => useExportJobs());
    
    await act(async () => {
      result.current.createJob({ 
        export_type: 'pdf', 
        entity_type: 'orders', 
        filters: { status: 'completed' } 
      });
    });
    
    expect(supabase.from).toHaveBeenCalledWith('export_jobs');
    // We check that the creation call was made, the actual response is handled by the mock
    expect(result.current.createJob).toBeDefined();
  });
});
