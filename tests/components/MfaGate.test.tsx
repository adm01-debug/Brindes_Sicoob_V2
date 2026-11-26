import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MfaGate } from '@/components/layout/MfaGate';

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockAuth }));
vi.mock('@/components/security/MfaEnrollmentDialog', () => ({
  MfaEnrollmentDialog: () => <p>Enrolar segundo fator</p>,
}));
vi.mock('@/components/security/MfaChallengeDialog', () => ({
  MfaChallengeDialog: () => <p>Confirmar segundo fator</p>,
}));

const base = {
  user: { id: 'gestor-teste' },
  isLoading: false,
  rolesLoaded: true,
  hasMFA: true,
  mfaRequired: false,
  currentAAL: 'aal2' as const,
};

function renderGate(extra = {}) {
  mockAuth.mockReturnValue({ ...base, ...extra });
  return render(<MfaGate><p>Verbas do gestor</p></MfaGate>);
}

describe('MfaGate das telas do gestor', () => {
  it('renderiza o conteúdo com segundo fator ativo e sessão aal2', () => {
    renderGate();
    expect(screen.getByText('Verbas do gestor')).toBeInTheDocument();
  });

  it('não renderiza o conteúdo para gestor sem segundo fator', () => {
    renderGate({ hasMFA: false });
    expect(screen.queryByText('Verbas do gestor')).not.toBeInTheDocument();
    expect(screen.getByText('Enrolar segundo fator')).toBeInTheDocument();
  });

  it('exige desafio quando a sessão ainda está em aal1', () => {
    renderGate({ mfaRequired: true, currentAAL: 'aal1' });
    expect(screen.queryByText('Verbas do gestor')).not.toBeInTheDocument();
    expect(screen.getByText('Confirmar segundo fator')).toBeInTheDocument();
  });

  it('mostra carregamento enquanto os papéis não chegam', () => {
    renderGate({ rolesLoaded: false });
    expect(screen.queryByText('Verbas do gestor')).not.toBeInTheDocument();
  });
});
