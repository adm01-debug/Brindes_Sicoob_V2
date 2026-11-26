/**
 * G-04: o pedido de aumento de verba era gravado e nunca chegava a ninguém
 * (nenhuma policy de UPDATE e RPC de decisão inexistente). O card tem que
 * listar os pendentes, respeitar a autoridade devolvida pelo banco e decidir
 * por RPC, exigindo motivo na recusa.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../render-helpers';
import { LimitIncreaseApprovalsCard } from '@/components/sicoob/LimitIncreaseApprovalsCard';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  askConfirm: vi.fn(),
}));

vi.mock('@/services/sicoob/approvalService', () => ({
  sicoobApprovalService: {
    listPendingLimitIncreaseRequests: mocks.list,
    approveLimitIncreaseRequest: mocks.approve,
    rejectLimitIncreaseRequest: mocks.reject,
  },
}));

vi.mock('@/stores/useConfirmDialogStore', () => ({
  askConfirm: mocks.askConfirm,
}));

const buildRequest = (overrides: Record<string, unknown> = {}) => ({
  id: 'req-1',
  pa_id: 'pa-1',
  requested_by: 'user-1',
  requester_name: 'Maria Gestora',
  current_limit: 50000,
  requested_limit: 80000,
  reason: 'Demanda extra de dezembro',
  status: 'pending',
  approved_by: null,
  rejection_reason: null,
  created_at: '2026-11-26T10:00:00.000Z',
  updated_at: '2026-11-26T10:00:00.000Z',
  postos_atendimento: { id: 'pa-1', nome: 'PA TESTE 01', cooperativa_id: 'coop-1' },
  can_decide: true,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.askConfirm.mockResolvedValue(true);
  mocks.approve.mockResolvedValue(null);
  mocks.reject.mockResolvedValue(null);
  mocks.list.mockResolvedValue([buildRequest()]);
});

describe('LimitIncreaseApprovalsCard', () => {
  it('lista o pedido pendente com PA, solicitante e motivo', async () => {
    renderWithProviders(<LimitIncreaseApprovalsCard />);

    expect(await screen.findByText('PA TESTE 01')).toBeInTheDocument();
    expect(screen.getByText('Maria Gestora')).toBeInTheDocument();
    expect(screen.getByTitle('Demanda extra de dezembro')).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há pedidos pendentes', async () => {
    mocks.list.mockResolvedValue([]);
    renderWithProviders(<LimitIncreaseApprovalsCard />);

    expect(
      await screen.findByText(/Nenhum pedido de aumento de verba aguardando decisão/),
    ).toBeInTheDocument();
  });

  it('desabilita as duas decisões quando o banco nega autoridade', async () => {
    mocks.list.mockResolvedValue([buildRequest({ can_decide: false })]);
    renderWithProviders(<LimitIncreaseApprovalsCard />);

    expect(await screen.findByLabelText('Aprovar aumento de verba')).toBeDisabled();
    expect(screen.getByLabelText('Recusar aumento de verba')).toBeDisabled();
  });

  it('aprova o pedido somente depois da confirmação', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LimitIncreaseApprovalsCard />);

    await user.click(await screen.findByLabelText('Aprovar aumento de verba'));

    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith('req-1'));
    expect(mocks.askConfirm).toHaveBeenCalled();
  });

  it('não aprova quando a confirmação é recusada', async () => {
    const user = userEvent.setup();
    mocks.askConfirm.mockResolvedValue(false);
    renderWithProviders(<LimitIncreaseApprovalsCard />);

    await user.click(await screen.findByLabelText('Aprovar aumento de verba'));

    expect(mocks.approve).not.toHaveBeenCalled();
  });

  it('exige motivo para recusar e envia a recusa com o texto informado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LimitIncreaseApprovalsCard />);

    await user.click(await screen.findByLabelText('Recusar aumento de verba'));
    await user.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(mocks.reject).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Motivo da recusa'), 'Verba comprometida no trimestre');
    await user.click(screen.getByRole('button', { name: 'Recusar' }));

    await waitFor(() =>
      expect(mocks.reject).toHaveBeenCalledWith('req-1', 'Verba comprometida no trimestre'),
    );
  });
});
