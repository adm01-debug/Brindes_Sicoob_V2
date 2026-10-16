import { describe, expect, it, vi } from 'vitest';
import { bootstrapErrorReporter } from '@/lib/error-reporter-bootstrap';

describe('bootstrapErrorReporter', () => {
  it('mantém a captura precoce até o import se recuperar e drena a fila uma única vez', async () => {
    const installGlobalErrorHandlers = vi.fn();
    const reportError = vi.fn();
    const removeEarlyListeners = vi.fn();
    const wait = vi.fn().mockResolvedValue(undefined);
    const load = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ installGlobalErrorHandlers, reportError });
    const queuedErrors = [{
      error: new Error('erro capturado antes do reporter'),
      metadata: { type: 'unhandled_error' },
    }];

    await expect(bootstrapErrorReporter({
      load,
      queuedErrors,
      removeEarlyListeners,
      retries: 2,
      retryDelayMs: 10,
      wait,
    })).resolves.toBe(true);

    expect(wait).toHaveBeenCalledWith(10);
    expect(installGlobalErrorHandlers).toHaveBeenCalledOnce();
    expect(removeEarlyListeners).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      { type: 'unhandled_error' },
    );
    expect(queuedErrors).toHaveLength(0);
  });

  it('preserva listeners e fila quando todas as tentativas falham', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const removeEarlyListeners = vi.fn();
    const queuedErrors = [{ error: new Error('ainda pendente'), metadata: {} }];

    await expect(bootstrapErrorReporter({
      load: vi.fn().mockRejectedValue(new Error('chunk indisponível')),
      queuedErrors,
      removeEarlyListeners,
      retries: 1,
      wait: vi.fn().mockResolvedValue(undefined),
    })).resolves.toBe(false);

    expect(removeEarlyListeners).not.toHaveBeenCalled();
    expect(queuedErrors).toHaveLength(1);
    consoleError.mockRestore();
  });
});
