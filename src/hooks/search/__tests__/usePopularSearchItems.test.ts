import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePopularSearchItems } from '../usePopularSearchItems';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [] })),
        })),
      })),
    })),
  },
}));

describe('usePopularSearchItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array if not enabled', () => {
    const { result } = renderHook(() => usePopularSearchItems(false));
    expect(result.current).toEqual([]);
  });

  it('should fetch and process popular items when enabled', async () => {
    const mockData = [
      { product_id: '1', product_name: 'Product A', product_sku: 'SKU-A' },
      { product_id: '1', product_name: 'Product A', product_sku: 'SKU-A' },
      { product_id: '2', product_name: 'Product B', product_sku: 'SKU-B' },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: mockData })),
        })),
      })),
    });

    const { result } = renderHook(() => usePopularSearchItems(true));

    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
    });

    expect(result.current[0].name).toBe('Product A');
    expect(result.current[0].view_count).toBe(2);
    expect(result.current[1].name).toBe('Product B');
    expect(result.current[1].view_count).toBe(1);
  });
});
