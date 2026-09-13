import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderPilotApprovalsTab } from '@/components/sicoob/orders/OrderPilotApprovalsTab';

const mutate = vi.fn();
const mutateAsync = vi.fn();
const hookState = {
  approvals: [] as Array<Record<string, unknown>>,
  isLoading: false,
  error: null,
  updateApprovalStatus: { mutate, isPending: false },
  uploadArtwork: { mutateAsync, isPending: false },
};

vi.mock('@/hooks/orders/extensions', () => ({
  useOrderPilotApprovals: () => hookState,
}));

describe('OrderPilotApprovalsTab', () => {
  beforeEach(() => {
    mutate.mockReset();
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ artworkId: 'arte-3' });
    hookState.approvals = [];
  });

  it('oferece decisão somente para a versão pendente vigente', () => {
    hookState.approvals = [
      {
        id: 'arte-2', version: 2, status: 'pending', is_latest: true,
        photo_url: null, file_path: 'pedido-1/artwork/v2.png', feedback: null, identity_snapshot: {},
      },
      {
        id: 'arte-1', version: 1, status: 'pending', is_latest: false,
        photo_url: null, file_path: 'pedido-1/artwork/v1.png', feedback: null, identity_snapshot: {},
      },
    ];

    render(<OrderPilotApprovalsTab orderId="pedido-1" />);

    expect(screen.getByText('Substituída')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /aprovar piloto/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /solicitar revisão/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^rejeitar$/i })).toHaveLength(1);
  });

  it('permite enviar uma nova versão antes da etapa de produção', async () => {
    render(<OrderPilotApprovalsTab orderId="pedido-1" />);

    const file = new File(['conteúdo'], 'piloto-sicoob.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Selecionar arquivo de arte'), { target: { files: [file] } });

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledExactlyOnceWith(file));
    expect(screen.getByRole('button', { name: /enviar nova versão/i })).toBeInTheDocument();
  });
});
