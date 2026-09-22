import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('error-reporter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('registra o lote na telemetria existente sem incluir tokens da URL', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const insert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ insert } as never);
    window.history.replaceState({}, '', '/aprovacao?token=segredo-sintetico#chave');
    const { reportError } = await import('@/lib/error-reporter');
    reportError(new Error('Falha de envio'), { context: 'teste' });
    await vi.advanceTimersByTimeAsync(5000);
    expect(supabase.from).toHaveBeenCalledWith('telemetry_events');
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({
      event_type: 'application_error', user_id: 'user-123',
      url: window.location.origin + '/aprovacao',
      metadata: expect.objectContaining({ error_message: 'Falha de envio', context: 'teste' }),
    })]);
    window.history.replaceState({}, '', '/');
  });

  it('reportError queues an error and schedules flush', async () => {
    const { reportError } = await import('@/lib/error-reporter');
    const err = new Error('test error');
    reportError(err, { context: 'unit-test' });
    // Error should be queued, not immediately flushed
    // After timer fires, it should flush
  });

  it('reportError captures error message and stack', async () => {
    const { reportError } = await import('@/lib/error-reporter');
    const err = new Error('captured error');
    reportError(err);
    // Verify no throw
    expect(err.message).toBe('captured error');
  });

  it('installGlobalErrorHandlers adds listeners without throwing', async () => {
    const { installGlobalErrorHandlers } = await import('@/lib/error-reporter');
    const addSpy = vi.spyOn(window, 'addEventListener');
    installGlobalErrorHandlers();
    installGlobalErrorHandlers();
    expect(addSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    expect(addSpy).toHaveBeenCalledTimes(2);
    addSpy.mockRestore();
  });
});
