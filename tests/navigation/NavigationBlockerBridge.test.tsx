import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavigationBlockerBridge } from '@/components/navigation/NavigationBlockerBridge';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

function Root() {
  return <><NavigationBlockerBridge /><Outlet /></>;
}

function createRouter() {
  return createMemoryRouter([
    { element: <Root />, children: [
      { path: '/a', element: <><h1>Página A</h1><Link to="/b">Ir para B</Link></> },
      { path: '/b', element: <h1>Página B</h1> },
    ] },
  ], { initialEntries: ['/a'] });
}

describe('NavigationBlockerBridge', () => {
  beforeEach(() => useNavigationGuardStore.setState({ dirtyScopes: {}, request: null }));

  it('cancela e depois confirma a mesma navegação sem duplicá-la', async () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);
    act(() => useNavigationGuardStore.getState().setDirty('formulario', true));

    await userEvent.click(screen.getByRole('link', { name: 'Ir para B' }));
    expect(router.state.location.pathname).toBe('/a');
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }));
    expect(router.state.location.pathname).toBe('/a');

    await userEvent.click(screen.getByRole('link', { name: 'Ir para B' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));
    expect(router.state.location.pathname).toBe('/b');
  });

  it('deixa navegar quando não há sujeira', async () => {
    const router = createRouter();
    render(<RouterProvider router={router} />);
    await userEvent.click(screen.getByRole('link', { name: 'Ir para B' }));
    expect(router.state.location.pathname).toBe('/b');
    expect(useNavigationGuardStore.getState().request).toBeNull();
  });
});
