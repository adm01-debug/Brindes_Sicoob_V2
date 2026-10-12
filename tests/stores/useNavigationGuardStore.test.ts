import { beforeEach, describe, expect, it } from 'vitest';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

describe('useNavigationGuardStore', () => {
  beforeEach(() => {
    useNavigationGuardStore.setState({ request: null, dirtyScopes: {} });
  });

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

  it('setDirty registra e remove escopos; hasDirty reflete qualquer escopo sujo', () => {
    const s = useNavigationGuardStore.getState();
    expect(s.hasDirty()).toBe(false);
    s.setDirty('form-a', true);
    s.setDirty('form-b', true);
    expect(s.hasDirty()).toBe(true);
    s.setDirty('form-a', false);
    expect(s.hasDirty()).toBe(true);
    s.setDirty('form-b', false);
    expect(s.hasDirty()).toBe(false);
    // remover escopo inexistente é no-op
    s.setDirty('nunca-registrado', false);
    expect(s.hasDirty()).toBe(false);
  });
});
