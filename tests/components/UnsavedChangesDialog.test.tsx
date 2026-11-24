import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  it('mantem o rotulo padrao de descarte', () => {
    render(<UnsavedChangesDialog open onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sair sem salvar' })).toBeInTheDocument();
  });

  it('aceita um rotulo que diz o que a saida faz com o trabalho', async () => {
    // O Kit Builder grava o kit pessoal no desmonte: prometer "sem salvar"
    // ali era mentira antes do dialogo aceitar rotulo.
    const onConfirm = vi.fn();
    render(
      <UnsavedChangesDialog open onConfirm={onConfirm} onCancel={vi.fn()} confirmLabel="Sair e gravar" />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sair e gravar' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
