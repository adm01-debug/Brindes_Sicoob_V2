import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { restore, useAutoSave } = vi.hoisted(() => ({
  restore: vi.fn(),
  useAutoSave: vi.fn(),
}));

vi.mock('@/hooks/useAutoSave', () => ({ useAutoSave }));

import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';

describe('QuoteAutoSave em orçamento somente leitura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAutoSave.mockReturnValue({ restore, lastError: null });
  });

  it('não persiste nem restaura o rascunho local', async () => {
    const onRestore = vi.fn();
    const { container } = render(
      <QuoteAutoSave
        enabled={false}
        quoteId="quote-1"
        scopeId="usuario-1"
        data={{ total: 100 }}
        onRestore={onRestore}
      />,
    );

    await waitFor(() => expect(useAutoSave).toHaveBeenCalledWith(expect.objectContaining({
      key: '',
      enabled: false,
    })));
    expect(restore).not.toHaveBeenCalled();
    expect(onRestore).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe('');
  });
});
