/**
 * Catraca: atalho do montador não pode mexer na etapa por baixo de um diálogo.
 *
 * Origem: revisão da PR #427 — o aviso de "alterado em outro lugar" passou do
 * `window.confirm` (bloqueia a página) para o diálogo global (não bloqueia). O
 * atalho escuta o `document` e não ignorava eventos vindos do diálogo, então a
 * seta esquerda trocava de etapa e "Continuar aqui" devolvia o vendedor à etapa
 * anterior.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useKitWizardShortcuts } from '@/hooks/useKitWizardShortcuts';

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

  it('continua navegando fora de diálogo', () => {
    const solto = document.createElement('button');
    document.body.appendChild(solto);
    solto.focus();
    const { onPrev } = montarHook();

    apertar(solto, 'ArrowLeft');

    expect(onPrev).toHaveBeenCalledTimes(1);
  });
});
