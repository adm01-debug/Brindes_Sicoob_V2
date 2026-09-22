import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), success: vi.fn(), error: vi.fn(),
  summary: { quote_number: '001', client_name: 'Cliente', total: 100, valid_until: null, status: 'active', responded_at: null },
}));
vi.mock('react-router-dom', () => ({ useParams: () => ({ token: 'token-sintetico' }) }));
vi.mock('@/hooks/useQuoteApprovalToken', () => ({ useQuoteApprovalToken: () => ({ data: mocks.summary, isLoading: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/quotes/QuoteApprovalCard', () => ({ QuoteApprovalCard: ({ onApprove }: { onApprove: () => void }) => <button onClick={onApprove}>Aprovar</button> }));
vi.mock('@/components/quotes/QuoteSignaturePad', () => ({ QuoteSignaturePad: ({ onSign, isSubmitting }: { onSign: (value: unknown) => void; isSubmitting: boolean }) => <button disabled={isSubmitting} onClick={() => onSign({ name: 'Pessoa', document: '12345678901', signatureDataUrl: 'data:image/png;base64,sintetico' })}>Confirmar</button> }));
import QuoteApprovalPage from '@/pages/QuoteApprovalPage';

beforeEach(() => vi.clearAllMocks());
describe('confirmação pública de orçamento', () => {
  it('recusa falso sucesso quando o banco retorna false', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    render(<QuoteApprovalPage />);
    fireEvent.click(screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(screen.getByText('Confirmar')).toBeEnabled();
  });
  it('envia a assinatura junto da decisão e confirma somente após commit', async () => {
    let conclude: (result: { data: boolean; error: null }) => void = () => {};
    mocks.rpc.mockReturnValue(new Promise(resolve => { conclude = resolve; }));
    render(<QuoteApprovalPage />);
    fireEvent.click(screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Confirmar'));
    expect(screen.getByText('Confirmar')).toBeDisabled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('submit_signed_quote_response', expect.objectContaining({ _response: 'approved', _signature_data_url: 'data:image/png;base64,sintetico' }));
    conclude({ data: true, error: null });
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
