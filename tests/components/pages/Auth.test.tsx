import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(), signOut: vi.fn(), toast: vi.fn(),
  auth: { user: null, role: null, isLoading: false, rolesLoaded: true },
  session: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  logLoginAttempt: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ ...mocks.auth, signIn: mocks.signIn, signOut: mocks.signOut }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useIPValidation', () => ({ useIPValidation: () => ({
  validateIPForAuthenticatedUser: vi.fn().mockResolvedValue({ isAllowed: true, hasRestrictions: false }),
  logLoginAttempt: mocks.logLoginAttempt,
}) }));
vi.mock('@/lib/diagnostics', () => ({ diagnostics: { log: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mocks.session },
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));
import Auth from '@/pages/Auth';

function renderizar() {
  return render(<HelmetProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Auth />} /></Routes></MemoryRouter>
  </QueryClientProvider></HelmetProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.logLoginAttempt.mockResolvedValue(undefined);
});
describe('Entrada institucional', () => {
  it('apresenta formulário acessível e remove contas de teste e provedores não configurados', () => {
    renderizar();
    expect(screen.getByRole('heading', { level: 1, name: 'Acesse seu portal' })).toBeVisible();
    expect(screen.getByLabelText('E-mail de trabalho')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('Senha', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByText(/login rápido|SOC 2|20.000|Google|passkey/i)).not.toBeInTheDocument();
    expect(screen.getAllByAltText('Sicoob').every(image => image.getAttribute('src') === '/brand/sicoob-logo.png')).toBe(true);
    expect(screen.getByRole('link', { name: 'Explorar loja demonstrativa' })).toHaveAttribute('href', '/loja-demo');
  });
  it('associa erros aos campos e não envia credenciais inválidas', async () => {
    const user = userEvent.setup(); renderizar();
    await user.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
    const email = screen.getByLabelText('E-mail de trabalho');
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(document.getElementById(email.getAttribute('aria-describedby')!)).toHaveAttribute('role', 'alert');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it('permite mostrar e ocultar a senha com estado anunciado', async () => {
    const user = userEvent.setup(); renderizar();
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Senha', { exact: true })).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(screen.getByLabelText('Senha', { exact: true })).toHaveAttribute('type', 'password');
  });
  it('envia o formulário válido uma vez e recupera o botão após erro', async () => {
    mocks.signIn.mockResolvedValue({ error: new Error('Invalid login credentials') });
    mocks.logLoginAttempt.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup(); renderizar();
    await user.type(screen.getByLabelText('E-mail de trabalho'), 'compras@cooperativa.example');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'senha-sintetica');
    await user.click(screen.getByRole('button', { name: 'Entrar', exact: true }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledExactlyOnceWith('compras@cooperativa.example', 'senha-sintetica'));
    expect(mocks.logLoginAttempt).toHaveBeenCalledExactlyOnceWith(
      'compras@cooperativa.example', null, false, 'Invalid login credentials',
    );
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Email ou senha incorretos' }));
    expect(screen.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  });
  it('permite abrir a recuperação de senha', async () => {
    const user = userEvent.setup(); renderizar();
    await user.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    await waitFor(() => expect(screen.getByTestId('forgot-password-screen')).toBeVisible());
  });
});
