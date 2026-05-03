import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotificationPreferences } from '../useNotificationPreferences';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user123' } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { user_id: 'user123', email_enabled: true, push_enabled: true }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { user_id: 'user123' }, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: { email_enabled: true, push_enabled: true }, isLoading: false })),
  useMutation: vi.fn((opts) => ({
    mutate: (vars) => opts.mutationFn(vars).then(opts.onSuccess),
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

describe('Notification Preferences Integration', () => {
  it('should fetch and update preferences correctly', async () => {
    const { result } = renderHook(() => useNotificationPreferences());
    
    expect(result.current.preferences?.email_enabled).toBe(true);
    
    await act(async () => {
      await result.current.updatePreferences({ email_enabled: false });
    });
    
    expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
  });
});
