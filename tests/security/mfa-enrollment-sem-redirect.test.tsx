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
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshAAL }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderDialog() {
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

    fireEvent.click(screen.getByRole('button', { name: /Começar/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Já escaneei, continuar/i }));
    fireEvent.change(screen.getByLabelText(/Código de autenticação/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verificar e ativar/i }));

    await waitFor(() => expect(refreshAAL).toHaveBeenCalled());
    expect(mfaMock.verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'challenge-1',
      code: '123456',
    });
    expect(screen.queryByText('Pagina 404')).not.toBeInTheDocument();
  });
});
