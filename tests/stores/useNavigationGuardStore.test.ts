import { beforeEach, describe, expect, it } from 'vitest';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

describe('useNavigationGuardStore', () => {
  beforeEach(() => useNavigationGuardStore.setState({ dirtyScopes: {}, request: null }));

  it('registra e remove escopos sujos', () => {
    const store = useNavigationGuardStore.getState();
    store.setDirty('orcamento', true, 'Mensagem do orçamento');
    expect(useNavigationGuardStore.getState().hasDirty()).toBe(true);
    expect(useNavigationGuardStore.getState().getMessage()).toBe('Mensagem do orçamento');
    store.setDirty('orcamento', false);
    expect(useNavigationGuardStore.getState().hasDirty()).toBe(false);
  });

  it('não permite que um requestId antigo limpe o pedido atual', () => {
    const store = useNavigationGuardStore.getState();
    store.setDirty('orcamento', true);
    const firstId = store.beginRequest({ currentPath: '/a', nextPath: '/b', historyAction: 'PUSH' });
    const secondId = store.beginRequest({ currentPath: '/a', nextPath: '/c', historyAction: 'PUSH' });
    store.clearRequest(firstId);
    expect(useNavigationGuardStore.getState().request?.id).toBe(secondId);
    store.clearRequest(secondId);
    expect(useNavigationGuardStore.getState().request).toBeNull();
  });

  it('clearAll invalida pedidos e sujeira no logout', () => {
    const store = useNavigationGuardStore.getState();
    store.setDirty('orcamento', true);
    store.beginRequest({ currentPath: '/a', nextPath: '/b', historyAction: 'POP' });
    store.clearAll();
    expect(useNavigationGuardStore.getState()).toMatchObject({ dirtyScopes: {}, request: null });
  });
});
