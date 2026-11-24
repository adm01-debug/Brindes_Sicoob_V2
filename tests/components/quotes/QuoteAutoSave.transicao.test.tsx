import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}));

import { QuoteAutoSave, limparRascunhoDoOrcamento } from '@/components/quotes/QuoteAutoSave';

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

  it('apaga o rascunho do orçamento que o usuário descartou', () => {
    localStorage.setItem('autosave_quote:usuario-3:orc-9', '{"version":1,"data":{}}');
    localStorage.setItem('autosave_quote:usuario-3:orc-8', '{"version":1,"data":{}}');

    limparRascunhoDoOrcamento({ scopeId: 'usuario-3', quoteId: 'orc-9' });

    expect(localStorage.getItem('autosave_quote:usuario-3:orc-9')).toBeNull();
    expect(localStorage.getItem('autosave_quote:usuario-3:orc-8')).not.toBeNull();
  });

  it('não apaga o rascunho que outra aba gravou', () => {
    // Mesmo usuário e mesmo orçamento em duas abas dividem a chave: o descarte
    // de uma não pode levar o trabalho da outra junto.
    sessionStorage.setItem('autosave-tab-id', 'aba-atual');
    localStorage.setItem(
      'autosave_quote:usuario-3:orc-9',
      JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { items: 10 }, tab: 'outra-aba' }),
    );

    limparRascunhoDoOrcamento({ scopeId: 'usuario-3', quoteId: 'orc-9' });

    expect(localStorage.getItem('autosave_quote:usuario-3:orc-9')).not.toBeNull();
  });

  it('apaga o rascunho que esta aba gravou', async () => {
    const props = { quoteId: 'orc-9', scopeId: 'usuario-3', onRestore: vi.fn() };
    const { rerender, unmount } = render(
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
    unmount();

    expect(localStorage.getItem('autosave_quote:usuario-3:orc-9')).not.toBeNull();
    limparRascunhoDoOrcamento({ scopeId: 'usuario-3', quoteId: 'orc-9' });
    expect(localStorage.getItem('autosave_quote:usuario-3:orc-9')).toBeNull();
  });

  it('apaga o rascunho que esta aba gravou antes de recarregar', () => {
    // Recarregar mantém a mesma aba: o rascunho guardado antes do reload é desta
    // sessão e precisa sair quando o usuário descarta, senão volta na reabertura.
    sessionStorage.setItem('autosave-tab-id', 'aba-recarregada');
    localStorage.setItem(
      'autosave_quote:usuario-3:orc-9',
      JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: { items: 10 }, tab: 'aba-recarregada' }),
    );

    limparRascunhoDoOrcamento({ scopeId: 'usuario-3', quoteId: 'orc-9' });

    expect(localStorage.getItem('autosave_quote:usuario-3:orc-9')).toBeNull();
  });

  it('apaga o rascunho novo da sessão quando o orçamento ainda não tem número', () => {
    sessionStorage.setItem('quote-new-draft:usuario-4', 'sessao-1');
    localStorage.setItem('autosave_draft:usuario-4:sessao-1', '{"version":1,"data":{}}');

    limparRascunhoDoOrcamento({ scopeId: 'usuario-4', quoteId: null });

    expect(localStorage.getItem('autosave_draft:usuario-4:sessao-1')).toBeNull();
  });
});
