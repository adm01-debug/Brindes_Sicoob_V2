import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

const { restore, useAutoSave } = vi.hoisted(() => ({
  restore: vi.fn(),
  useAutoSave: vi.fn(),
}));

vi.mock('@/hooks/useAutoSave', () => ({ useAutoSave }));

import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';

describe('QuoteAutoSave em orçamento somente leitura', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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

  it('espera o identificador do rascunho antes de restaurar a chave local', async () => {
    render(
      <TooltipProvider>
        <QuoteAutoSave
          scopeId="usuario-2"
          data={{ total: 150 }}
          onRestore={vi.fn()}
        />
      </TooltipProvider>,
    );

    await waitFor(() => expect(useAutoSave).toHaveBeenLastCalledWith(expect.objectContaining({
      key: expect.stringMatching(/^draft:usuario-2:/),
      enabled: true,
    })));

    expect(useAutoSave).toHaveBeenCalledWith(expect.objectContaining({ key: '', enabled: false }));
    expect(restore).toHaveBeenCalledTimes(1);
  });
});
