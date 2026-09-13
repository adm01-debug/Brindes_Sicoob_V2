import { renderHook, waitFor, act } from '@testing-library/react';
import { useAllowedIPs } from '@/hooks/useAllowedIPs';
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

// Mock fetch for current IP
global.fetch = vi.fn();

describe('useAllowedIPs', () => {
  const mockUser = { id: 'user-123' };
  const mockIP = '192.168.1.1';

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (global.fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ ip: mockIP }),
    });
  });

  it('should fetch allowed IPs on mount', async () => {
    const mockData = [
      { id: '1', user_id: 'user-123', ip_address: '1.1.1.1', is_active: true, created_at: new Date().toISOString() },
    ];

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useAllowedIPs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.allowedIPs).toEqual(mockData);
    expect(result.current.currentIP).toBe(mockIP);
  });

  it('should add a new IP correctly', async () => {
    const newIP = '2.2.2.2';
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useAllowedIPs());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let addResult;
    await act(async () => {
      addResult = await result.current.addIP(newIP, 'Home');
    });

    expect(addResult!.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith({
      created_by: mockUser.id,
      ip_address: newIP,
      label: 'Home',
    });
  });

  it('should remove an IP correctly', async () => {
    const ipId = 'ip-123';
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    
    const mockFrom = vi.fn().mockReturnValue({
      delete: mockDelete,
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    (supabase.from as any).mockImplementation(mockFrom);

    const { result } = renderHook(() => useAllowedIPs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let removeResult;
    await act(async () => {
      removeResult = await result.current.removeIP(ipId);
    });

    expect(removeResult!.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('should correctly identify if an IP is allowed', async () => {
    const mockData = [
      { id: '1', user_id: 'user-123', ip_address: '1.1.1.1', is_active: true },
      { id: '2', user_id: 'user-123', ip_address: '2.2.2.2', is_active: false },
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useAllowedIPs());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isIPAllowed('1.1.1.1')).toBe(true);
    expect(result.current.isIPAllowed('2.2.2.2')).toBe(false);
    expect(result.current.isIPAllowed('3.3.3.3')).toBe(false);
  });
});
