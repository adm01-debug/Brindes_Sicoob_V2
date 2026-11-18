import { render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { hasOpenOverlay, dismissTopmostOverlay } from '@/lib/overlay';

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
