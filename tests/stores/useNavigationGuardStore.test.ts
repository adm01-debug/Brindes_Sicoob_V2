import { describe, expect, it } from 'vitest';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

describe('useNavigationGuardStore', () => {
  it('resolve(true) confirma a saída', async () => {
    const promise = useNavigationGuardStore.getState().requestConfirmation();
    expect(useNavigationGuardStore.getState().request).not.toBeNull();
    useNavigationGuardStore.getState().resolve(true);
    await expect(promise).resolves.toBe(true);
    expect(useNavigationGuardStore.getState().request).toBeNull();
  });

  it('resolve(false) cancela a saída', async () => {
    const promise = useNavigationGuardStore.getState().requestConfirmation();
    useNavigationGuardStore.getState().resolve(false);
    await expect(promise).resolves.toBe(false);
  });

  it('novo pedido cancela o anterior pendente', async () => {
    const first = useNavigationGuardStore.getState().requestConfirmation();
    const second = useNavigationGuardStore.getState().requestConfirmation('outra msg');
    await expect(first).resolves.toBe(false);
    useNavigationGuardStore.getState().resolve(true);
    await expect(second).resolves.toBe(true);
  });

  it('resolve sem pedido é no-op', () => {
    expect(() => useNavigationGuardStore.getState().resolve(true)).not.toThrow();
  });
});
