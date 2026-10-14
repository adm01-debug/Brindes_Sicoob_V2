import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/onboarding/RestartTourButton', () => ({
  RestartTourButton: () => <button type="button">Reiniciar tour</button>,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isDev: false, isAdmin: false, roles: ['agente'] }),
}));

import HelpCenterPage from '@/pages/HelpCenterPage';

describe('Central de Ajuda', () => {
  it('oferece caminhos operacionais e orientação segura de suporte', () => {
    render(
      <MemoryRouter>
        <HelpCenterPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Como podemos ajudar?' })).toBeTruthy();
    expect(
      screen.getAllByRole('link', { name: 'Abrir' })[0]?.getAttribute('href'),
    ).toBe('/filtros');
    expect(screen.getByText(/Nunca compartilhe senha/)).toBeTruthy();
    expect(screen.getByText('Ctrl ou ⌘ + K')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reiniciar tour' })).toBeTruthy();
    expect(screen.queryByText('Acompanhar pedidos')).toBeNull();
  });
});
