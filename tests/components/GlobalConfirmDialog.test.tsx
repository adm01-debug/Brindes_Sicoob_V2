import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { GlobalConfirmDialog } from '@/components/common/GlobalConfirmDialog';
import { askConfirm, useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

describe('GlobalConfirmDialog', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({ request: null });
  });

  it('exibe título/descrição e confirma com o rótulo customizado', async () => {
    render(<GlobalConfirmDialog />);
    const promise = askConfirm({
      title: 'Excluir PA?',
      description: 'Esta ação não pode ser desfeita.',
      variant: 'destructive',
      confirmLabel: 'Excluir',
    });

    expect(await screen.findByText('Excluir PA?')).toBeTruthy();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeTruthy();

    await userEvent.click(screen.getByText('Excluir'));
    await expect(promise).resolves.toBe(true);
    expect(useConfirmDialogStore.getState().request).toBeNull();
  });

  it('"Cancelar" resolve false', async () => {
    render(<GlobalConfirmDialog />);
    const promise = askConfirm({ title: 'Aprovar pedido?' });

    await userEvent.click(await screen.findByText('Cancelar'));
    await expect(promise).resolves.toBe(false);
  });
});
