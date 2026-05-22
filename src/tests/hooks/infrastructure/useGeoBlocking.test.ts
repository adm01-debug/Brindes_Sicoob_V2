import { renderHook, waitFor, act } from '@testing-library/react';
import { useGeoBlocking } from '@/hooks/useGeoBlocking';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock fetch for geo location
global.fetch = vi.fn();

describe('useGeoBlocking', () => {
  const mockUser = { id: 'user-123' };
  const mockGeo = { country_code: 'BR', country_name: 'Brazil' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve(mockGeo),
    });
  });

  it('should fetch countries and settings on mount', async () => {
    const mockCountries = [
      { id: '1', country_code: 'BR', city_name: 'Brazil', is_active: true },
    ];
    const mockSettings = { city_whitelist_enabled: true };

    const mockFrom = vi.fn((table) => {
      if (table === 'city_whitelist') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCountries, error: null }),
          }),
        };
      }
      if (table === 'access_security_settings') {
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useGeoBlocking());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.countries).toEqual(mockCountries);
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.currentCountry).toEqual({ code: 'BR', name: 'Brazil' });
  });

  it('should add a country correctly', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn((table) => {
      if (table === 'city_whitelist') {
        return {
          insert: mockInsert,
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      };
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useGeoBlocking());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let addResult;
    await act(async () => {
      addResult = await result.current.addCountry('US', 'United States');
    });

    expect(addResult!.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      city_name: 'United States',
      country_code: 'US',
      created_by: mockUser.id,
    });
  });

  it('should toggle blocking enabled status', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      not: vi.fn().mockResolvedValue({ error: null }),
    });
    
    const mockFrom = vi.fn((table) => {
      if (table === 'access_security_settings') {
        return {
          update: mockUpdate,
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { city_whitelist_enabled: false }, error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useGeoBlocking());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let toggleResult;
    await act(async () => {
      toggleResult = await result.current.toggleEnabled(true);
    });

    expect(toggleResult!.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      city_whitelist_enabled: true,
    }));
  });

  it('should correctly identify if a country is allowed', async () => {
    const mockCountries = [
      { id: '1', country_code: 'BR', is_active: true },
    ];
    
    const mockFrom = vi.fn((table) => {
      if (table === 'city_whitelist') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockCountries, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { city_whitelist_enabled: true }, error: null }),
          }),
        }),
      };
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useGeoBlocking());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isCountryAllowed('BR')).toBe(true);
    expect(result.current.isCountryAllowed('US')).toBe(false);
  });
});
