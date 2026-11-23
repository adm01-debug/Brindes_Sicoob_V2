import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendTransactionalEmail } from '@/hooks/useTransactionalEmail';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
const params = { event_type: 'quote_sent' as const, quote_id: 'orcamento-sintetico' };
describe('confirmação de email transacional', () => {
  beforeEach(() => { invoke.mockReset(); });
  it.each([null, {}, { success: false }, { success: 'true' }, { success: true, message: 'Email validated and queued successfully' }])('não anuncia envio para resposta sem confirmação: %j', async (data) => {
    invoke.mockResolvedValue({ data, error: null });
    expect((await sendTransactionalEmail(params)).success).toBe(false);
  });
  it('erro no transporte prevalece sobre sucesso no corpo', async () => {
    invoke.mockResolvedValue({ data: { success: true, delivery_status: 'accepted', provider_id: 'email-sintetico' }, error: { message: 'detalhe privado' } });
    expect(await sendTransactionalEmail(params)).toEqual({ success: false, error: 'O serviço não confirmou o envio do email.' });
  });
  it('aceita confirmação explícita', async () => {
    invoke.mockResolvedValue({ data: { success: true, delivery_status: 'accepted', provider_id: 'email-sintetico' }, error: null });
    expect((await sendTransactionalEmail(params)).success).toBe(true);
  });
  it('envia apenas a referência, nunca destinatário ou corpo', async () => {
    invoke.mockResolvedValue({ data: { success: true, delivery_status: 'accepted', provider_id: 'email-sintetico' }, error: null });
    await sendTransactionalEmail(params);
    expect(invoke).toHaveBeenCalledWith('send-transactional-email', { body: params });
    expect(Object.keys(invoke.mock.calls[0][1].body)).toEqual(['event_type', 'quote_id']);
  });
  it('exceção de rede retorna falha sem dados privados', async () => {
    invoke.mockRejectedValue(new Error('detalhe privado'));
    expect(await sendTransactionalEmail(params)).toEqual({ success: false, error: 'Não foi possível solicitar o envio do email.' });
  });
});
