/**
 * O diálogo de ativação do segundo fator NÃO pode navegar ao concluir.
 * Ele mandava para "/admin", que não é rota registrada no App.tsx (cai no
 * catch-all "*" → página 404). O admin/gestor ativava o MFA e perdia a tela
 * em que estava. A liberação deve vir do refreshAAL() (hasMFA), não de rota.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MfaEnrollmentDialog } from '@/components/security/MfaEnrollmentDialog';
import { AdminRoute } from '@/components/layout/AdminRoute';

const mfaMock = vi.hoisted(() => ({
  listFactors: vi.fn(),
  unenroll: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { mfa: mfaMock } },
}));

const refreshAAL = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const authState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState.current }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Supervisora com acesso à tela e sem segundo fator: é o estado em que a guarda
// abre o diálogo de ativação. O papel espelha o grupo /admin do App.tsx, que
// usa <AdminRoute /> sem requiredRole (guard padrão: supervisor).
const supervisorSemMfa = {
  user: { id: 'supervisor-1' },
  roles: ['supervisor'],
  rolesLoaded: true,
  rolesError: null,
  isLoading: false,
  currentAAL: 'aal1',
  hasMFA: false,
  mfaRequired: true,
};

// Elemento novo a cada chamada: reaproveitar a mesma referência faz o React
// pular a re-renderização da guarda e o teste mediria a árvore antiga.
function adminRouteTree() {
  return (
    <MemoryRouter initialEntries={['/admin/verbas']}>
      <Routes>
        <Route
          path="/admin/verbas"
          element={
            <AdminRoute>
              <p>Verbas do PA</p>
            </AdminRoute>
          }
        />
        <Route path="*" element={<p>Pagina 404</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderAdminRoute() {
  return render(adminRouteTree());
}

async function ativarSegundoFator() {
  fireEvent.click(screen.getByRole('button', { name: /Começar/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Já escaneei, continuar/i }));
  fireEvent.change(screen.getByLabelText(/Código de autenticação/i), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Verificar e ativar/i }));
  await waitFor(() => expect(refreshAAL).toHaveBeenCalled());
}

function renderDialog() {
  authState.current = { refreshAAL };
  return render(
    <MemoryRouter initialEntries={['/admin/verbas']}>
      <Routes>
        <Route
          path="/admin/verbas"
          element={
            <>
              <p>Verbas do PA</p>
              <MfaEnrollmentDialog open onOpenChange={() => {}} enforce />
            </>
          }
        />
        <Route path="*" element={<p>Pagina 404</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MfaEnrollmentDialog: sem redirect para rota inexistente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshAAL.mockResolvedValue(undefined);
    mfaMock.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    mfaMock.enroll.mockResolvedValue({
      data: { id: 'factor-1', totp: { qr_code: 'data:image/png;base64,AAA', secret: 'SEGREDO' } },
      error: null,
    });
    mfaMock.challenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null });
    mfaMock.verify.mockResolvedValue({ error: null });
  });

  it('permanece na rota de origem depois de ativar o segundo fator', async () => {
    renderDialog();

    await ativarSegundoFator();
    expect(mfaMock.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(screen.queryByText('Pagina 404')).not.toBeInTheDocument();
  });

  it('a guarda libera a tela no endereço de origem quando o fator fica ativo', async () => {
    authState.current = { ...supervisorSemMfa, refreshAAL };
    const { rerender } = renderAdminRoute();

    // Sem segundo fator a guarda não entrega a tela, só o diálogo de ativação.
    expect(screen.queryByText('Verbas do PA')).not.toBeInTheDocument();

    await ativarSegundoFator();

    // É o que refreshAAL() faz no AuthContext: hasMFA muda e a mesma rota
    // re-renderiza já liberada. Sem isso a guarda continuaria bloqueada.
    authState.current = { ...supervisorSemMfa, hasMFA: true, currentAAL: 'aal2', refreshAAL };
    rerender(adminRouteTree());

    expect(screen.getByText('Verbas do PA')).toBeInTheDocument();
    expect(screen.queryByText('Pagina 404')).not.toBeInTheDocument();
  });
});
