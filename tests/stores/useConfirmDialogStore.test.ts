import { beforeEach, describe, expect, it } from 'vitest';
import { askConfirm, useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

describe('useConfirmDialogStore', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({ request: null });
  });

  it('resolve(true) confirma a ação', async () => {
    const promise = askConfirm({ title: 'Excluir item?' });
    expect(useConfirmDialogStore.getState().request?.title).toBe('Excluir item?');
    useConfirmDialogStore.getState().resolve(true);
    await expect(promise).resolves.toBe(true);
    expect(useConfirmDialogStore.getState().request).toBeNull();
  });

  it('resolve(false) cancela a ação', async () => {
    const promise = askConfirm({ title: 'Excluir item?' });
    useConfirmDialogStore.getState().resolve(false);
    await expect(promise).resolves.toBe(false);
  });

  it('novo pedido cancela o anterior pendente', async () => {
    const first = askConfirm({ title: 'Primeiro' });
    const second = askConfirm({ title: 'Segundo' });
    await expect(first).resolves.toBe(false);
    useConfirmDialogStore.getState().resolve(true);
    await expect(second).resolves.toBe(true);
  });

  it('resolve sem pedido é no-op', () => {
    expect(() => useConfirmDialogStore.getState().resolve(true)).not.toThrow();
  });
});
