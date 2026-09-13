import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAtomicVersion: vi.fn().mockResolvedValue('versao-criada'),
  toastSuccess: vi.fn(),
}));

vi.mock('@/services/quotes/quoteVersionService', () => ({
  quoteVersionService: { createAtomicVersion: mocks.createAtomicVersion },
}));
vi.mock('sonner', () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));

import { createAndLoadQuoteVersion } from '@/hooks/useQuoteVersions';

describe('pós-commit do versionamento de orçamento', () => {
  it('preserva o ID criado quando a recarga imediata falha', async () => {
    const fetchQuote = vi.fn().mockRejectedValue(new Error('falha transitória'));
    const fetchVersions = vi.fn();

    await expect(createAndLoadQuoteVersion('origem', fetchQuote, fetchVersions))
      .resolves.toEqual({ id: 'versao-criada' });
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Nova versão criada', expect.any(Object));
  });
});
