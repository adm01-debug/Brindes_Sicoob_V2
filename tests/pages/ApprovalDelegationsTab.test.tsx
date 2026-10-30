import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApprovalDelegationsTab } from '@/pages/admin/sicoob/tabs/ApprovalDelegationsTab';
import { sicoobApprovalDelegationService } from '@/services/sicoob/approvalDelegationService';

vi.mock('@/services/sicoob/approvalDelegationService', () => ({
  sicoobApprovalDelegationService: {
    list: vi.fn(),
    listCandidates: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  },
}));

const renderTab = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ApprovalDelegationsTab />
    </QueryClientProvider>,
  );
};

describe('ApprovalDelegationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sicoobApprovalDelegationService.listCandidates).mockResolvedValue([]);
    vi.mocked(sicoobApprovalDelegationService.list).mockResolvedValue([
      {
        id: 'delegacao-1',
        delegator_id: 'titular-1',
        delegate_id: 'substituto-1',
        cooperative_id: 'coop-1',
        pa_id: 'pa-1',
        competencies: ['approve_order', 'reject_order'],
        starts_at: new Date(Date.now() - 60_000).toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
        reason: 'Férias programadas do titular',
        created_at: new Date().toISOString(),
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
        delegate: { full_name: 'Maria Substituta', email: 'maria@example.com' },
        delegator: { full_name: 'João Titular', email: 'joao@example.com' },
        cooperative: { nome: 'Sicoob Singular Centro' },
        pa: { nome: 'PA Centro' },
      },
    ]);
  });

  it('expõe ator, titular, escopo, competências e vigência da delegação', async () => {
    renderTab();

    expect(await screen.findByText('Maria Substituta')).toBeInTheDocument();
    expect(screen.getByText('João Titular')).toBeInTheDocument();
    expect(screen.getByText('Sicoob Singular Centro')).toBeInTheDocument();
    expect(screen.getByText('PA Centro')).toBeInTheDocument();
    expect(screen.getByText('Aprovar')).toBeInTheDocument();
    expect(screen.getByText('Rejeitar')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
  });

  it('exige justificativa formal antes da revogação', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: /revogar/i }));

    const confirm = screen.getByRole('button', { name: /confirmar revogação/i });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Justificativa formal'), {
      target: { value: 'Titular retornou antes do período previsto' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(sicoobApprovalDelegationService.revoke).toHaveBeenCalledWith(
        'delegacao-1',
        'Titular retornou antes do período previsto',
      );
    });
  });
});
