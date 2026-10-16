import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavigationHistoryMenu } from '@/components/common/NavigationHistoryMenu';
import { getUxMetrics, resetUxMetrics } from '@/lib/uxMetrics';
import { useNavigationStore, type NavigationHistoryItem } from '@/stores/useNavigationStore';

function renderMenu(initialPath = '/pedidos') {
  const locationRef = { current: '' };
  function Probe() {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}`;
    return null;
  }
  render(<MemoryRouter initialEntries={[initialPath]}><NavigationHistoryMenu /><Probe /></MemoryRouter>);
  return locationRef;
}

function seedHistory(items: Array<Pick<NavigationHistoryItem, 'pathname'> & Partial<NavigationHistoryItem>>) {
  useNavigationStore.setState({
    history: items.map((item, index) => ({
      key: item.key ?? `key-${index}`,
      pathname: item.pathname,
      search: item.search ?? '',
      title: item.title ?? item.pathname,
      timestamp: Date.now() - index,
      stateRequired: item.stateRequired ?? false,
      ...(Object.prototype.hasOwnProperty.call(item, 'state') ? { state: item.state } : {}),
    })),
    direction: 'forward',
  });
}

describe('NavigationHistoryMenu', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
    resetUxMetrics();
  });

  it('omite entradas que exigem estado efêmero indisponível', () => {
    seedHistory([
      { pathname: '/orcamentos/novo', title: 'Novo orçamento', stateRequired: true },
    ]);
    renderMenu('/pedidos');
    expect(screen.queryByLabelText('Histórico de páginas visitadas')).toBeNull();
  });

  it('restaura uma página válida e registra o salto', async () => {
    seedHistory([
      { pathname: '/pedidos', key: 'atual', title: 'Pedidos' },
      { pathname: '/produtos', key: 'anterior', title: 'Produtos' },
    ]);
    const locationRef = renderMenu('/pedidos');
    await userEvent.click(screen.getByLabelText('Histórico de páginas visitadas'));
    await userEvent.click(await screen.findByText('Produtos'));

    expect(locationRef.current).toBe('/produtos');
    expect(useNavigationStore.getState().direction).toBe('backward');
    expect(getUxMetrics()['nav.history-jump']).toBe(1);
  });
});
