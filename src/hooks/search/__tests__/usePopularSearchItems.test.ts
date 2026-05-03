
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePopularSearchItems } from '../usePopularSearchItems';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [
              { product_id: '1', product_name: 'Product A', product_sku: 'SKU1' },
              { product_id: '1', product_name: 'Product A', product_sku: 'SKU1' },
              { product_id: '2', product_name: 'Product B', product_sku: 'SKU2' },
            ],
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('usePopularSearchItems', () => {
  it('should return popular products based on view count', async () => {
    const { result } = renderHook(() => usePopularSearchItems(true));

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));

    expect(result.current[0].id).toBe('1');
    expect(result.current[0].view_count).toBe(2);
    expect(result.current[1].id).toBe('2');
    expect(result.current[1].view_count).toBe(1);
  });

  it('should return empty array if disabled', async () => {
    const { result } = renderHook(() => usePopularSearchItems(false));
    expect(result.current).toEqual([]);
  });
});
