import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { useKeyboardShortcuts } from '@/components/mockup/KeyboardShortcuts';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { hasOpenOverlay, dismissTopmostOverlay, isOverlayDismissEvent } from '@/lib/overlay';

describe('overlay — detecção com componentes Radix reais', () => {
  it('tooltip aberto NÃO conta como overlay', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip open>
          <TooltipTrigger>Voltar</TooltipTrigger>
          <TooltipContent>dica do botão</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await screen.findByText('dica do botão');
    expect(hasOpenOverlay()).toBe(false);
    expect(dismissTopmostOverlay()).toBe(false);
  });

  it('popover aberto conta como overlay', async () => {
    render(
      <Popover open>
        <PopoverTrigger>abrir</PopoverTrigger>
        <PopoverContent>conteúdo do popover</PopoverContent>
      </Popover>,
    );
    await screen.findByText('conteúdo do popover');
    expect(hasOpenOverlay()).toBe(true);
  });

  it('dialog Radix real fecha com dismissTopmostOverlay', async () => {
    function ControlledDialog() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent><p>conteúdo do diálogo</p></DialogContent>
        </Dialog>
      );
    }
    render(<ControlledDialog />);
    await screen.findByText('conteúdo do diálogo');
    expect(hasOpenOverlay()).toBe(true);
    expect(dismissTopmostOverlay()).toBe(true);
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });
});

describe('overlay — o Escape de descarte não aciona atalho destrutivo', () => {
  function montarAtalhosDoGerador(onReset: () => void) {
    return renderHook(() =>
      useKeyboardShortcuts({
        onGenerate: () => {},
        onReset,
        onDownload: () => {},
        canGenerate: true,
        canDownload: true,
        isLoading: false,
      }),
    );
  }

  it('fechar overlay pelo Voltar não limpa o formulário do gerador de mockup', async () => {
    // Regressão: o Escape sintético chegava ao document, onde o gerador
    // escuta, e disparava resetForm → clearDraft, apagando o rascunho.
    const onReset = vi.fn();
    const atalhos = montarAtalhosDoGerador(onReset);

    function ControlledDialog() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent><p>seletor de técnica</p></DialogContent>
        </Dialog>
      );
    }
    const tela = render(<ControlledDialog />);
    await screen.findByText('seletor de técnica');

    act(() => { expect(dismissTopmostOverlay()).toBe(true); });
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(onReset).not.toHaveBeenCalled();

    tela.unmount();
    atalhos.unmount();
  });

  it('Escape digitado pelo usuário continua limpando o formulário', () => {
    const onReset = vi.fn();
    const atalhos = montarAtalhosDoGerador(onReset);
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(onReset).toHaveBeenCalledTimes(1);
    atalhos.unmount();
  });

  it('isOverlayDismissEvent distingue o evento sintético do digitado', () => {
    const digitado = new KeyboardEvent('keydown', { key: 'Escape' });
    expect(isOverlayDismissEvent(digitado)).toBe(false);

    const capturados: KeyboardEvent[] = [];
    const ouvinte = (event: Event) => capturados.push(event as KeyboardEvent);
    document.addEventListener('keydown', ouvinte);
    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('data-state', 'open');
    document.body.appendChild(overlay);

    dismissTopmostOverlay();

    document.removeEventListener('keydown', ouvinte);
    overlay.remove();
    expect(capturados).toHaveLength(1);
    expect(isOverlayDismissEvent(capturados[0])).toBe(true);
  });
});
