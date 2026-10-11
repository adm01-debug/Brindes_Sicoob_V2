import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { NavigationGuardDialog } from '@/components/common/NavigationGuardDialog';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';

describe('NavigationGuardDialog', () => {
  beforeEach(() => {
    useNavigationGuardStore.setState({ request: null });
  });

  it('exibe o diálogo pt-BR quando há pedido de confirmação', async () => {
    render(<NavigationGuardDialog />);
    const promise = useNavigationGuardStore.getState().requestConfirmation('msg teste');

    expect(await screen.findByText('Alterações não salvas')).toBeTruthy();
    expect(screen.getByText('msg teste')).toBeTruthy();

    await userEvent.click(screen.getByText('Sair sem salvar'));
    await expect(promise).resolves.toBe(true);
  });

  it('"Continuar editando" cancela a saída', async () => {
    render(<NavigationGuardDialog />);
    const promise = useNavigationGuardStore.getState().requestConfirmation();

    await userEvent.click(await screen.findByText('Continuar editando'));
    await expect(promise).resolves.toBe(false);
    expect(useNavigationGuardStore.getState().request).toBeNull();
  });
});
