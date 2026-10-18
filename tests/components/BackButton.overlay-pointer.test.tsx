import { useEffect, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackButton } from '@/components/common/BackButton';

const navigation = vi.hoisted(() => ({ goBack: vi.fn() }));

vi.mock('@/hooks/useSmartNavigation', () => ({
  useSmartNavigation: () => ({
    goBack: navigation.goBack,
    previousItem: { pathname: '/pedidos', title: 'Pedidos' },
    history: [{ pathname: '/pedidos/1' }, { pathname: '/pedidos' }],
    direction: 'forward',
  }),
}));

function Harness() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  return (
    <>
      {open && <div data-navigation-overlay="blocking">Menu aberto</div>}
      <BackButton />
    </>
  );
}

describe('BackButton com overlay aberto', () => {
  beforeEach(() => navigation.goBack.mockReset());

  it('consome pointerdown/click ao fechar o overlay e navega só no clique seguinte', async () => {
    render(<MemoryRouter initialEntries={['/pedidos/1']}><TooltipProvider><Harness /></TooltipProvider></MemoryRouter>);
    const button = screen.getByRole('button', { name: /Voltar para Pedidos/i });

    await userEvent.click(button);
    expect(screen.queryByText('Menu aberto')).toBeNull();
    expect(navigation.goBack).not.toHaveBeenCalled();

    await userEvent.click(button);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
