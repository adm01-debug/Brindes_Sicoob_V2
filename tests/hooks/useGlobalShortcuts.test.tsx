import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
const openOracle = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>();
  return { ...original, useNavigate: () => navigate };
});

vi.mock('@/stores/oracleVoiceBridge', () => ({
  useOracleVoiceBridge: (selector: (state: { openOracle: () => void }) => unknown) =>
    selector({ openOracle }),
}));

import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';

describe('atalhos globais', () => {
  beforeEach(() => {
    navigate.mockReset();
    openOracle.mockReset();
  });

  it('reserva Ctrl+K para a barra global de comandos', () => {
    renderHook(() => useGlobalShortcuts());
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    act(() => document.dispatchEvent(event));

    expect(event.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(openOracle).not.toHaveBeenCalled();
  });

  it('preserva o atalho Ctrl+J do assistente', () => {
    renderHook(() => useGlobalShortcuts());
    const event = new KeyboardEvent('keydown', {
      key: 'j',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    act(() => document.dispatchEvent(event));

    expect(event.defaultPrevented).toBe(true);
    expect(openOracle).toHaveBeenCalledOnce();
  });
});
