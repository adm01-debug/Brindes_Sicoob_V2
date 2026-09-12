/**
 * Testes de acesso para /admin/conexoes.
 *
 * Garante que a rota só exibe credenciais quando o usuário possui papel dev
 * e sessão MFA AAL2,
 * e que erros 401/403 do secrets-manager produzem mensagem clara na UI
 * em vez de mostrarem todas as credenciais como "AUSENTE".
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DevRoute } from '@/components/layout/DevRoute';
import { CardSourceDiagnostic } from '@/components/admin/connections/CardSourceDiagnostic';
import { ExplainModeProvider } from '@/components/admin/connections/ExplainModeContext';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/access/DevAccessDeniedPage', () => ({
  DevAccessDeniedPage: () => <div>Acesso técnico negado</div>,
}));

vi.mock('@/lib/access/log-access-denied', () => ({
  logAccessDenied: vi.fn().mockResolvedValue(undefined),
}));

const baseAuth = {
  currentAAL: 'aal2' as const,
  hasMFA: true,
  mfaRequired: false,
  isLoading: false,
  refreshAAL: vi.fn(),
};

/**
 * Reproduz o gate real de App.tsx para /admin/conexoes:
 *   <DevRoute> ← exige papel dev + MFA AAL2
 */
function renderConexoesRoute() {
  return render(
    <MemoryRouter
      initialEntries={['/admin/conexoes']}
    >
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<DevRoute />}>
          <Route
            path="/admin/conexoes"
            element={<div>Credenciais Sensíveis</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('Acesso a /admin/conexoes', () => {
  it('redireciona para /login quando não há sessão', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: null,
      isDev: false,
      role: null,
    });
    renderConexoesRoute();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Credenciais Sensíveis')).not.toBeInTheDocument();
  });

  it('exibe bloqueio técnico para vendedor', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: { id: 'u-1' },
      isDev: false,
      role: 'vendedor',
    });
    renderConexoesRoute();
    expect(screen.getByText('Acesso técnico negado')).toBeInTheDocument();
    expect(screen.queryByText('Credenciais Sensíveis')).not.toBeInTheDocument();
  });

  it('exibe bloqueio técnico para supervisor', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: { id: 'u-2' },
      isDev: false,
      role: 'supervisor',
    });
    renderConexoesRoute();
    expect(screen.getByText('Acesso técnico negado')).toBeInTheDocument();
    expect(screen.queryByText('Credenciais Sensíveis')).not.toBeInTheDocument();
  });

  it('renderiza credenciais quando o usuário é dev com MFA AAL2', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: { id: 'u-3' },
      isDev: true,
      role: 'dev',
    });
    renderConexoesRoute();
    expect(screen.getByText('Credenciais Sensíveis')).toBeInTheDocument();
  });

  it('bloqueia dev sem MFA (gate de enrollment)', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuth,
      user: { id: 'u-3' },
      isDev: true,
      role: 'dev',
      hasMFA: false,
    });
    renderConexoesRoute();
    expect(screen.queryByText('Credenciais Sensíveis')).not.toBeInTheDocument();
  });
});

describe('CardSourceDiagnostic — erros 401/403 do secrets-manager', () => {
  function renderDiag(loadError: { code: string; message: string }) {
    return render(
      <ExplainModeProvider>
        <CardSourceDiagnostic
          fields={[
            { label: 'URL do projeto', status: undefined },
            { label: 'Service Role Key', status: undefined },
          ]}
          loadError={loadError}
        />
      </ExplainModeProvider>,
    );
  }

  it('exibe mensagem clara para 401 (sessão expirada)', () => {
    renderDiag({ code: 'unauthenticated', message: 'jwt expired' });
    expect(
      screen.getByText(/Sessão expirada — não foi possível ler as credenciais/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Faça login novamente/i)).toBeInTheDocument();
    expect(screen.getByText(/código: unauthenticated/i)).toBeInTheDocument();
    // Não deve regredir para o diagnóstico "AUSENTE" (false positive)
    expect(screen.queryByText(/AUSENTE/)).not.toBeInTheDocument();
  });

  it('exibe mensagem clara para 403 (sem permissão)', () => {
    renderDiag({ code: 'forbidden', message: 'admin only' });
    expect(
      screen.getByText(/Sem permissão para ler credenciais/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Apenas administradores podem visualizar\/editar credenciais/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/código: forbidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/AUSENTE/)).not.toBeInTheDocument();
  });

  it('alerta tem role=alert e aria-live para tecnologias assistivas', () => {
    renderDiag({ code: 'unauthenticated', message: 'jwt expired' });
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});
