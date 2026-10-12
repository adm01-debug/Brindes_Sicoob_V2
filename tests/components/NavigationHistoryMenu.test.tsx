import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavigationHistoryMenu } from '@/components/common/NavigationHistoryMenu';
import { useNavigationStore } from '@/stores/useNavigationStore';

function renderMenu(initialPath = '/pedidos') {
  const locationRef = { current: '' };
  const Probe = () => {
    locationRef.current = useLocation().pathname + useLocation().search;
    return null;
  };
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavigationHistoryMenu />
      <Probe />
    </MemoryRouter>,
  );
  return locationRef;
}

function seedHistory(items: Array<{ pathname: string; search?: string; title?: string }>) {
  useNavigationStore.setState({
    history: items.map((item, i) => ({
      pathname: item.pathname,
      search: item.search ?? '',
      title: item.title ?? item.pathname,
      timestamp: Date.now() - i,
    })),
    direction: 'forward',
  });
}

describe('NavigationHistoryMenu', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
  });

  it('não renderiza nada sem páginas anteriores', () => {
    seedHistory([{ pathname: '/pedidos', title: 'Pedidos' }]);
    renderMenu('/pedidos');
    expect(screen.queryByLabelText('Histórico de páginas visitadas')).toBeNull();
  });

  it('lista páginas recentes e navega ao clicar', async () => {
    seedHistory([
      { pathname: '/pedidos', title: 'Pedidos' },
      { pathname: '/orcamentos', search: '?tab=abertos', title: 'Orçamentos' },
      { pathname: '/produtos', title: 'Produtos' },
    ]);
    const locationRef = renderMenu('/pedidos');

    await userEvent.click(screen.getByLabelText('Histórico de páginas visitadas'));
    await userEvent.click(await screen.findByText('Produtos'));

    expect(locationRef.current).toBe('/produtos');
    expect(useNavigationStore.getState().direction).toBe('backward');
  });
});
