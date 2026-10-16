import { render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  dismissBlockingNavigationOverlay,
  hasBlockingNavigationOverlay,
} from '@/lib/navigation/overlay-registry';

describe('registro de overlays de navegação', () => {
  it('ignora tooltip aberto', async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip open><TooltipTrigger>Voltar</TooltipTrigger><TooltipContent>Dica</TooltipContent></Tooltip>
      </TooltipProvider>,
    );
    await screen.findByText('Dica');
    expect(hasBlockingNavigationOverlay()).toBe(false);
  });

  it('detecta popover Radix aberto', async () => {
    render(<Popover open><PopoverTrigger>Abrir</PopoverTrigger><PopoverContent>Conteúdo</PopoverContent></Popover>);
    await screen.findByText('Conteúdo');
    expect(hasBlockingNavigationOverlay()).toBe(true);
  });

  it('fecha diálogo Radix pelo Escape comum', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return <Dialog open={open} onOpenChange={setOpen}><DialogContent>Diálogo</DialogContent></Dialog>;
    }
    render(<Harness />);
    await screen.findByText('Diálogo');
    expect(dismissBlockingNavigationOverlay()).toBe(true);
    await waitFor(() => expect(screen.queryByText('Diálogo')).toBeNull());
  });

  it('reconhece e fecha overlay customizado pelo contrato explícito', async () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      useEffect(() => {
        const close = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('keydown', close);
        return () => document.removeEventListener('keydown', close);
      }, []);
      return open ? <div data-navigation-overlay="blocking">Overlay próprio</div> : null;
    }
    render(<Harness />);
    expect(hasBlockingNavigationOverlay()).toBe(true);
    expect(dismissBlockingNavigationOverlay()).toBe(true);
    await waitFor(() => expect(screen.queryByText('Overlay próprio')).toBeNull());
  });
});
