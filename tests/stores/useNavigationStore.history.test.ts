import { beforeEach, describe, expect, it } from 'vitest';
import { canRestoreNavigationItem, useNavigationStore, type NavigationHistoryItem } from '@/stores/useNavigationStore';

const item = (key: string, pathname: string, state?: unknown) => ({
  key,
  pathname,
  search: '',
  title: pathname,
  timestamp: Date.now(),
  state,
});

describe('histórico de navegação', () => {
  beforeEach(() => {
    localStorage.clear();
    useNavigationStore.setState({ history: [], direction: 'forward' });
  });

  it('registra PUSH e atualiza apenas o topo em REPLACE', () => {
    const store = useNavigationStore.getState();
    store.record(item('a', '/a'), 'PUSH');
    store.record(item('b', '/b'), 'PUSH');
    store.record({ ...item('b2', '/b'), search: '?q=1' }, 'REPLACE');

    expect(useNavigationStore.getState().history.map(({ key }) => key)).toEqual(['b2', 'a']);
    expect(useNavigationStore.getState().history[0]?.search).toBe('?q=1');
  });

  it('vários REPLACEs de busca não lotam o histórico', () => {
    const store = useNavigationStore.getState();
    store.record(item('a', '/a'), 'PUSH');
    store.record(item('b', '/pedidos'), 'PUSH');
    for (let index = 0; index < 12; index += 1) {
      store.record({ ...item(`b-${index}`, '/pedidos'), search: `?q=${index}` }, 'REPLACE');
    }
    expect(useNavigationStore.getState().history).toHaveLength(2);
  });

  it('preserva visitas de mesma URL com keys e states diferentes em memória', () => {
    const store = useNavigationStore.getState();
    store.record(item('sim-1', '/simulador', { product: 'A' }), 'PUSH');
    store.record(item('outra', '/produtos'), 'PUSH');
    store.record(item('sim-2', '/simulador', { product: 'B' }), 'PUSH');
    expect(useNavigationStore.getState().history.filter(({ pathname }) => pathname === '/simulador')).toHaveLength(2);
  });

  it('não persiste location.state e sinaliza entrada impossível de restaurar após reload', () => {
    useNavigationStore.getState().record(item('sim-1', '/simulador', { secretMarker: 'nao-persistir' }), 'PUSH');
    const persisted = localStorage.getItem('navigation-history') ?? '';
    expect(persisted).not.toContain('nao-persistir');

    const rehydrated = { ...useNavigationStore.getState().history[0] } as NavigationHistoryItem;
    delete rehydrated.state;
    expect(rehydrated.stateRequired).toBe(true);
    expect(canRestoreNavigationItem(rehydrated)).toBe(false);
  });

  it('POP move a key conhecida ao topo sem duplicá-la', () => {
    const store = useNavigationStore.getState();
    store.record(item('a', '/a'), 'PUSH');
    store.record(item('b', '/b'), 'PUSH');
    store.record(item('a', '/a'), 'POP');
    expect(useNavigationStore.getState().history.map(({ key }) => key)).toEqual(['a', 'b']);
  });
});
