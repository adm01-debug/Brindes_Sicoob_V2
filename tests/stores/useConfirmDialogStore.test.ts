import { beforeEach, describe, expect, it } from 'vitest';
import { askConfirm, useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

describe('useConfirmDialogStore', () => {
  beforeEach(() => {
    useConfirmDialogStore.setState({ request: null });
  });

  it('resolve(true) confirma a ação', async () => {
    const promise = askConfirm({ title: 'Excluir item?' });
    const request = useConfirmDialogStore.getState().request;
    expect(request?.title).toBe('Excluir item?');
    useConfirmDialogStore.getState().resolve(request!.id, true);
    await expect(promise).resolves.toBe(true);
    expect(useConfirmDialogStore.getState().request).toBeNull();
  });

  it('resolve(false) cancela a ação', async () => {
    const promise = askConfirm({ title: 'Excluir item?' });
    const requestId = useConfirmDialogStore.getState().request!.id;
    useConfirmDialogStore.getState().resolve(requestId, false);
    await expect(promise).resolves.toBe(false);
  });

  it('novo pedido cancela o anterior pendente', async () => {
    const first = askConfirm({ title: 'Primeiro' });
    const second = askConfirm({ title: 'Segundo' });
    await expect(first).resolves.toBe(false);
    const secondId = useConfirmDialogStore.getState().request!.id;
    useConfirmDialogStore.getState().resolve(secondId, true);
    await expect(second).resolves.toBe(true);
  });

  it('uma resposta antiga não resolve um pedido concorrente', async () => {
    const first = askConfirm({ title: 'Primeiro' });
    const firstId = useConfirmDialogStore.getState().request!.id;
    const second = askConfirm({ title: 'Segundo' });
    const secondId = useConfirmDialogStore.getState().request!.id;

    useConfirmDialogStore.getState().resolve(firstId, true);
    expect(useConfirmDialogStore.getState().request?.id).toBe(secondId);
    useConfirmDialogStore.getState().resolve(secondId, false);

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
  });

  it('cancelCurrent cancela a solicitação pendente', async () => {
    const promise = askConfirm({ title: 'Excluir item?' });
    useConfirmDialogStore.getState().cancelCurrent();
    await expect(promise).resolves.toBe(false);
    expect(useConfirmDialogStore.getState().request).toBeNull();
  });

  it('resolve sem pedido é no-op', () => {
    expect(() => useConfirmDialogStore.getState().resolve(-1, true)).not.toThrow();
  });
});
