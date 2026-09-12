import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const updateResult = vi.fn();
const update = vi.fn(() => ({
  eq: vi.fn(() => ({ eq: updateResult })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => ({ update })) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'usuario-1' } }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }));

import { useKitAutoSave } from '@/hooks/useKitAutoSave';

const initialKit = {
  name: 'Kit', kitType: 'montado' as const,
  box: { id: 'caixa-1', name: 'Caixa', sku: 'CX-1', imageUrl: null, price: 0, internalWidth: 1, internalHeight: 1, internalDepth: 1, internalVolume: 1 },
  items: [],
  personalization: { box: { enabled: false }, items: {} }, totalItemsVolume: 0,
  availableVolume: 0, volumeUsagePercent: 0, totalWeight: 0, boxPrice: 0,
  itemsPrice: 0, personalizationPrice: 0, totalPrice: 0, isValid: false,
  validationErrors: [],
};

describe('useKitAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it('não confirma salvamento quando o Supabase retorna erro e permite nova tentativa', async () => {
    updateResult.mockResolvedValueOnce({ error: new Error('banco indisponível') });
    updateResult.mockResolvedValueOnce({ error: null });

    const { result, rerender } = renderHook(
      ({ kit }) => useKitAutoSave(kit, 1, 'kit-1'),
      { initialProps: { kit: initialKit } },
    );

    rerender({ kit: { ...initialKit, name: 'Kit atualizado' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(result.current.lastSaveError).toContain('banco indisponível');
    expect(result.current.lastSavedAt).toBeNull();

    await act(async () => { result.current.retry(); await Promise.resolve(); });
    expect(result.current.lastSaveError).toBeNull();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });
});
