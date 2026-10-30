import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  ingest: vi.fn(),
  updateShipment: vi.fn(),
  uploadInvoice: vi.fn(),
  addInvoice: vi.fn(),
}));

vi.mock('@/hooks/sicoob/useSicoobFulfillment', () => ({
  useSicoobShipment: () => ({ data: null, isLoading: false }),
  useUpdateSicoobShipment: () => ({ mutateAsync: mocks.updateShipment, isPending: false }),
}));

vi.mock('@/hooks/orders/extensions', () => ({
  useOrderInvoices: () => ({
    invoices: [],
    addInvoice: { mutateAsync: mocks.addInvoice },
    uploadFile: mocks.uploadInvoice,
    getInvoiceDownloadUrl: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/services/sicoob/documentIngestService', () => ({
  sicoobDocumentIngestService: { ingest: mocks.ingest },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: () => ({ createSignedUrl: vi.fn() }) } },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { OrderInvoicesTab } from '@/components/sicoob/orders/OrderInvoicesTab';
import { OrderLogisticsTab } from '@/components/sicoob/orders/OrderLogisticsTab';

describe('controles operacionais de pedidos', () => {
  it('não oferece anexar NF para quem não gerencia o pedido', () => {
    render(<OrderInvoicesTab orderId="pedido-1" canManage={false} />);

    expect(screen.queryByText('Anexar Nova Nota Fiscal')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Número da NF')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma nota fiscal anexada a este pedido.')).toBeInTheDocument();
  });

  it('bloqueia rastreio e comprovante mesmo se um evento for disparado fora da interface', () => {
    const { container } = render(
      <OrderLogisticsTab orderId="pedido-1" orderStatus="in_transit" canManage={false} />,
    );

    expect(screen.getByRole('button', { name: 'Confirmar rastreio' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Enviar comprovante/ })).toBeDisabled();

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [new File(['comprovante'], 'entrega.png', { type: 'image/png' })] },
    });

    expect(mocks.ingest).not.toHaveBeenCalled();
    expect(mocks.updateShipment).not.toHaveBeenCalled();
  });
});
