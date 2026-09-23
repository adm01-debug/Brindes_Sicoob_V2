import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(), from: vi.fn(), success: vi.fn(), error: vi.fn(),
  summary: { quote_number: '001', client_name: 'Cliente', total: 100, valid_until: null, status: 'active', responded_at: null },
  isLoading: false,
  isError: false,
}));
vi.mock('react-router-dom', () => ({ useParams: () => ({ token: 'token-sintetico' }) }));
vi.mock('@/hooks/useQuoteApprovalToken', () => ({ useQuoteApprovalToken: () => ({ data: mocks.summary, isLoading: mocks.isLoading, isError: mocks.isError }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke }, from: mocks.from } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/components/quotes/QuoteApprovalCard', () => ({ QuoteApprovalCard: ({ onApprove, status }: { onApprove: () => void; status: string }) => <><span>{status}</span><button onClick={onApprove}>Aprovar</button></> }));
vi.mock('@/components/quotes/QuoteSignaturePad', () => ({ QuoteSignaturePad: ({ onSign, isSubmitting }: { onSign: (value: unknown) => void; isSubmitting: boolean }) => <button disabled={isSubmitting} onClick={() => onSign({ name: 'Pessoa', document: '12345678901', signatureDataUrl: 'data:image/png;base64,sintetico' })}>Confirmar</button> }));
import QuoteApprovalPage from '@/pages/QuoteApprovalPage';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isLoading = false;
  mocks.isError = false;
  mocks.summary = { quote_number: '001', client_name: 'Cliente', total: 100, valid_until: null, status: 'active', responded_at: null };
});
describe('confirmação pública de orçamento', () => {
  it('distingue indisponibilidade da consulta de link inválido', () => {
    mocks.isError = true;
    render(<QuoteApprovalPage />);
    expect(screen.getByText(/Não foi possível consultar o orçamento/)).toBeInTheDocument();
    expect(screen.queryByText('Link inválido ou expirado.')).not.toBeInTheDocument();
  });

  it('mostra a decisão já registrada em vez do estado genérico', () => {
    mocks.summary = { ...mocks.summary, status: 'responded', response: 'approved', responded_at: '2026-09-22T12:00:00Z' } as typeof mocks.summary;
    render(<QuoteApprovalPage />);
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.queryByText('responded')).not.toBeInTheDocument();
  });
  it('recusa falso sucesso quando o banco retorna false', async () => {
    mocks.invoke.mockResolvedValue({ data: { success: false }, error: null });
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
    mocks.invoke.mockReturnValue(new Promise(resolve => { conclude = resolve; }));
    render(<QuoteApprovalPage />);
    fireEvent.click(screen.getByText('Aprovar'));
    fireEvent.click(screen.getByText('Confirmar'));
    expect(screen.getByText('Confirmar')).toBeDisabled();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.invoke).toHaveBeenCalledWith('quote-approval', { body: expect.objectContaining({ action: 'respond', status: 'approved', signer: expect.objectContaining({ signatureDataUrl: 'data:image/png;base64,sintetico' }) }) });
    conclude({ data: { success: true } as unknown as boolean, error: null });
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
