import { describe, expect, it, vi } from 'vitest';
import { sendScheduledReportEmail } from '../../supabase/functions/_shared/scheduled-report-email';

const input = {
  apiKey: 're_test_key',
  to: 'compras@example.com',
  subject: 'Relatório semanal',
  html: '<p>Relatório</p>',
  idempotencyKey: 'scheduled-report:report-1:2026-10-30T08:00:00.000Z',
};

describe('sendScheduledReportEmail', () => {
  it('falha sem chave do provedor e não avança o agendamento', async () => {
    const recordSent = vi.fn();
    const fetcher = vi.fn();

    await expect(sendScheduledReportEmail({ ...input, apiKey: undefined, fetcher }, recordSent))
      .rejects.toThrow('RESEND_API_KEY não configurada');

    expect(fetcher).not.toHaveBeenCalled();
    expect(recordSent).not.toHaveBeenCalled();
  });

  it.each([429, 500, 503])('não avança o agendamento quando Resend responde HTTP %s', async (status) => {
    const recordSent = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(new Response('falha', { status }));

    await expect(sendScheduledReportEmail({ ...input, fetcher }, recordSent))
      .rejects.toThrow(`HTTP ${status}`);

    expect(recordSent).not.toHaveBeenCalled();
  });

  it('não avança o agendamento sem recibo válido, mesmo com HTTP 2xx', async () => {
    const recordSent = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'aceito sem id' }), { status: 200 }),
    );

    await expect(sendScheduledReportEmail({ ...input, fetcher }, recordSent))
      .rejects.toThrow('não retornou o identificador');

    expect(recordSent).not.toHaveBeenCalled();
  });

  it('confirma e avança apenas após receber o recibo, usando chave idempotente estável', async () => {
    const order: string[] = [];
    const recordSent = vi.fn(async (emailId: string) => {
      order.push(`record:${emailId}`);
    });
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      order.push('provider');
      expect(new Headers(init?.headers).get('Idempotency-Key')).toBe(input.idempotencyKey);
      expect(JSON.parse(String(init?.body))).toMatchObject({
        to: [input.to],
        subject: input.subject,
        html: input.html,
      });
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    });

    await expect(sendScheduledReportEmail({ ...input, fetcher }, recordSent)).resolves.toBe('email_123');

    expect(order).toEqual(['provider', 'record:email_123']);
    expect(recordSent).toHaveBeenCalledTimes(1);
  });

  it('não registra como enviado se a persistência do agendamento falhar', async () => {
    const recordSent = vi.fn().mockRejectedValue(new Error('falha no banco'));
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }));

    await expect(sendScheduledReportEmail({ ...input, fetcher }, recordSent))
      .rejects.toThrow('falha no banco');

    expect(recordSent).toHaveBeenCalledWith('email_123');
  });

  it('rejeita chave de idempotência ausente ou acima do limite do provedor', async () => {
    const fetcher = vi.fn();

    await expect(sendScheduledReportEmail({ ...input, idempotencyKey: '', fetcher }, vi.fn()))
      .rejects.toThrow('Chave de idempotência');
    await expect(sendScheduledReportEmail({ ...input, idempotencyKey: 'x'.repeat(257), fetcher }, vi.fn()))
      .rejects.toThrow('Chave de idempotência');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
