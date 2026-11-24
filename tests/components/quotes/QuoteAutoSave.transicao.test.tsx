import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';

describe('QuoteAutoSave quando o orçamento deixa de ser editável', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('grava no mesmo rascunho a edição feita durante o envio', async () => {
    // Enviar o orçamento muda o status e a tela fica somente leitura, o que
    // desliga o rascunho automático. O que foi digitado durante a chamada ainda
    // não chegou ao intervalo de 2s: precisa ser gravado antes de desligar.
    const props = { quoteId: 'orc-9', scopeId: 'usuario-3', onRestore: vi.fn() };
    const chave = 'autosave_quote:usuario-3:orc-9';
    const { rerender } = render(
      <TooltipProvider>
        <QuoteAutoSave {...props} enabled data={{ items: 10 }} />
      </TooltipProvider>,
    );

    rerender(
      <TooltipProvider>
        <QuoteAutoSave {...props} enabled data={{ items: 12 }} />
      </TooltipProvider>,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(JSON.parse(localStorage.getItem(chave)!)).toMatchObject({ data: { items: 12 } });

    rerender(
      <TooltipProvider>
        <QuoteAutoSave {...props} enabled data={{ items: 14 }} />
      </TooltipProvider>,
    );
    rerender(
      <TooltipProvider>
        <QuoteAutoSave {...props} enabled={false} data={{ items: 14 }} />
      </TooltipProvider>,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(JSON.parse(localStorage.getItem(chave)!)).toMatchObject({ data: { items: 14 } });
    expect(props.onRestore).not.toHaveBeenCalled();
  });
});
