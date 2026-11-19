import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavigationHistoryMenu } from '@/components/common/NavigationHistoryMenu';
import { getUxMetrics } from '@/lib/uxMetrics';
import { useNavigationStore } from '@/stores/useNavigationStore';

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

function seedHistory(items: Array<{ pathname: string; search?: string; title?: string; timestamp?: number }>) {
  useNavigationStore.setState({
    history: items.map((item, index) => ({
      pathname: item.pathname,
      search: item.search ?? '',
      title: item.title ?? item.pathname,
      timestamp: item.timestamp ?? Date.now() - index,
    })),
    direction: 'forward',
  });
}

describe('NavigationHistoryMenu', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
  });

  it('não renderiza quando não há histórico além da rota atual', () => {
    seedHistory([{ pathname: '/pedidos', title: 'Pedidos' }]);
    renderMenu('/pedidos');
    expect(screen.queryByLabelText('Histórico de páginas visitadas')).toBeNull();
  });

  it('restaura uma página válida e registra o salto', async () => {
    const jumpsBefore = getUxMetrics()['nav.history-jump'] ?? 0;
    seedHistory([
      { pathname: '/pedidos', title: 'Pedidos' },
      { pathname: '/produtos', title: 'Produtos' },
    ]);
    const locationRef = renderMenu('/pedidos');
    await userEvent.click(screen.getByLabelText('Histórico de páginas visitadas'));
    await userEvent.click(await screen.findByText('Produtos'));

    expect(locationRef.current).toBe('/produtos');
    expect(useNavigationStore.getState().direction).toBe('backward');
    expect(getUxMetrics()['nav.history-jump']).toBe(jumpsBefore + 1);
  });

  it('omite a própria rota atual da lista', async () => {
    seedHistory([
      { pathname: '/orcamentos', title: 'Orçamentos' },
      { pathname: '/pedidos', title: 'Pedidos' },
    ]);
    renderMenu('/pedidos');
    await userEvent.click(screen.getByLabelText('Histórico de páginas visitadas'));
    expect(screen.queryByText('Pedidos')).toBeNull();
    expect(await screen.findByText('Orçamentos')).toBeInTheDocument();
  });
});
