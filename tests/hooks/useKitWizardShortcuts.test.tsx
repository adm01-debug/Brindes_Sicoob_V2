/**
 * Catraca: atalho do montador não pode mexer na etapa por baixo de um diálogo.
 *
 * Origem: revisão da PR #427 — o aviso de "alterado em outro lugar" passou do
 * `window.confirm` (bloqueia a página) para o diálogo global (não bloqueia). O
 * atalho escuta o `document` e não ignorava eventos vindos do diálogo, então a
 * seta esquerda trocava de etapa e "Continuar aqui" devolvia o vendedor à etapa
 * anterior.
 */
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { GlobalConfirmDialog } from '@/components/common/GlobalConfirmDialog';
import { useKitWizardShortcuts } from '@/hooks/useKitWizardShortcuts';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';

function montarDialogo(role: string) {
  const dialogo = document.createElement('div');
  dialogo.setAttribute('role', role);
  const botao = document.createElement('button');
  botao.textContent = 'Continuar aqui';
  dialogo.appendChild(botao);
  document.body.appendChild(dialogo);
  botao.focus();
  return botao;
}

function apertar(alvo: HTMLElement, key: string) {
  alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

function montarHook() {
  const onPrev = vi.fn();
  const onNext = vi.fn();
  renderHook(() =>
    useKitWizardShortcuts({
      canProceed: true,
      currentStep: 'personalization',
      completedSteps: ['box', 'items', 'personalization'],
      onPrev,
      onNext,
      onJump: vi.fn(),
    }),
  );
  return { onPrev, onNext };
}

describe('useKitWizardShortcuts', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('não troca de etapa quando a tecla vem de um diálogo aberto', () => {
    const botao = montarDialogo('alertdialog');
    const { onPrev } = montarHook();

    apertar(botao, 'ArrowLeft');

    expect(onPrev).not.toHaveBeenCalled();
  });

  it('não troca de etapa a partir de um diálogo comum de formulário', () => {
    const botao = montarDialogo('dialog');
    const { onPrev } = montarHook();

    apertar(botao, 'ArrowLeft');

    expect(onPrev).not.toHaveBeenCalled();
  });

  it('ignora a seta vinda do diálogo global de confirmação, o diálogo real', async () => {
    // O filtro depende do papel que o diálogo real declara: se ele parasse de
    // usar role="dialog"/"alertdialog", o atalho voltaria a mexer na etapa por
    // baixo da confirmação sem ninguém perceber.
    render(<MemoryRouter><GlobalConfirmDialog /></MemoryRouter>);
    await act(async () => { void useConfirmDialogStore.getState().ask({ title: 'Recarregar?', cancelLabel: 'Continuar aqui' }); });

    const dialogo = screen.getByRole('alertdialog');
    const botao = screen.getByRole('button', { name: 'Continuar aqui' });
    expect(dialogo.contains(botao)).toBe(true);

    // O vendedor aperta a seta com o foco dentro da confirmação: é o alvo do
    // evento que o filtro precisa reconhecer, não a caixa de texto do editor.
    botao.focus();
    expect(dialogo.contains(document.activeElement)).toBe(true);

    const { onPrev } = montarHook();
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });

    expect(onPrev).not.toHaveBeenCalled();
    await act(async () => { useConfirmDialogStore.getState().cancelCurrent(); });
  });

  it('continua navegando fora de diálogo', () => {
    const solto = document.createElement('button');
    document.body.appendChild(solto);
    solto.focus();
    const { onPrev } = montarHook();

    apertar(solto, 'ArrowLeft');

    expect(onPrev).toHaveBeenCalledTimes(1);
  });
});
