import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GlobalConfirmDialog } from '@/components/common/GlobalConfirmDialog';
import { askConfirm, useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

describe('GlobalConfirmDialog', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({ request: null });
  });

  it('exibe título/descrição e confirma com o rótulo customizado', async () => {
    render(<GlobalConfirmDialog />, { wrapper: MemoryRouter });
    let promise!: Promise<boolean>;
    act(() => {
      promise = askConfirm({
        title: 'Excluir PA?',
        description: 'Esta ação não pode ser desfeita.',
        variant: 'destructive',
        confirmLabel: 'Excluir',
      });
    });

    expect(await screen.findByText('Excluir PA?')).toBeTruthy();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeTruthy();

    await userEvent.click(screen.getByText('Excluir'));
    await expect(promise).resolves.toBe(true);
    expect(useConfirmDialogStore.getState().request).toBeNull();
  });

  it('"Cancelar" resolve false', async () => {
    render(<GlobalConfirmDialog />, { wrapper: MemoryRouter });
    let promise!: Promise<boolean>;
    act(() => {
      promise = askConfirm({ title: 'Aprovar pedido?' });
    });

    await userEvent.click(await screen.findByText('Cancelar'));
    await expect(promise).resolves.toBe(false);
  });

  it('Escape cancela e devolve o foco para quem abriu a confirmação', async () => {
    function Harness() {
      return (
        <>
          <button type="button" data-testid="gatilho">
            Remover item
          </button>
          <GlobalConfirmDialog />
        </>
      );
    }

    render(<Harness />, { wrapper: MemoryRouter });
    const gatilho = screen.getByTestId('gatilho');
    gatilho.focus();
    expect(document.activeElement).toBe(gatilho);

    let promise!: Promise<boolean>;
    act(() => {
      promise = askConfirm({ title: 'Remover item?', variant: 'destructive' });
    });

    // O diálogo rouba o foco ao abrir: sem isso, Tab continuaria na página atrás.
    const confirmar = await screen.findByText('Confirmar');
    expect(gatilho.contains(document.activeElement)).toBe(false);
    expect(confirmar.closest('[role="alertdialog"]')?.contains(document.activeElement)).toBe(true);

    await userEvent.keyboard('{Escape}');

    await expect(promise).resolves.toBe(false);
    expect(useConfirmDialogStore.getState().request).toBeNull();
    expect(document.activeElement).toBe(gatilho);
  });

  it('devolve o foco para o botão de dentro de outro diálogo', async () => {
    // OwnershipRepairDialog abre a confirmação de cima de um AlertDialog já
    // aberto; o foco tem de voltar para dentro do diálogo que continua montado.
    function Empilhado() {
      return (
        <>
          <AlertDialog open>
            <AlertDialogContent>
              <AlertDialogTitle>Reparo de registros</AlertDialogTitle>
              <button type="button" data-testid="reparar">
                Reparar
              </button>
            </AlertDialogContent>
          </AlertDialog>
          <GlobalConfirmDialog />
        </>
      );
    }

    render(<Empilhado />, { wrapper: MemoryRouter });
    const reparar = await screen.findByTestId('reparar');
    reparar.focus();

    let promise!: Promise<boolean>;
    act(() => {
      promise = askConfirm({ title: 'Reparar 12 registros?', confirmLabel: 'Confirmar reparo' });
    });

    await userEvent.click(await screen.findByText('Confirmar reparo'));
    await expect(promise).resolves.toBe(true);
    expect(document.activeElement).toBe(reparar);
  });

  it('cancela a solicitação pendente ao desmontar', async () => {
    const view = render(<GlobalConfirmDialog />, { wrapper: MemoryRouter });
    let promise!: Promise<boolean>;
    act(() => {
      promise = askConfirm({ title: 'Excluir registro?' });
    });

    view.unmount();

    await expect(promise).resolves.toBe(false);
  });

  it('cancela a solicitação pendente ao trocar de rota', async () => {
    let navigate!: ReturnType<typeof useNavigate>;
    function RouteHarness() {
      navigate = useNavigate();
      return <GlobalConfirmDialog />;
    }

    render(<RouteHarness />, { wrapper: MemoryRouter });
    let promise!: Promise<boolean>;
    act(() => {
      promise = askConfirm({ title: 'Excluir registro?' });
      navigate('/outra-rota');
    });

    await expect(promise).resolves.toBe(false);
    expect(useConfirmDialogStore.getState().request).toBeNull();
  });
});
