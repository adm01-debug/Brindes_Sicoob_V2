/**
 * Regressão: o focus trap do tour tratava qualquer elemento fora do diálogo
 * como fuga do modal e trazia o foco de volta. Com isso, abrir o Spotlight
 * (`Ctrl+Shift+P`, que renderiza em `z-101`, acima do tour) e apertar Tab
 * devolvia o foco ao tour — a busca ficava inalcançável pelo teclado.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentStep: 0 }));

vi.mock('@/contexts/OnboardingContext', () => ({
  useOnboardingContext: () => ({
    isLoading: false,
    showTour: true,
    setShowTour: vi.fn(),
    currentStep: mocks.currentStep,
    hasCompletedTour: false,
    currentStepData: {
      id: 'passo-0',
      title: 'Passo 1',
      description: 'Conteúdo do passo.',
      targetSelector: '[data-tour-target]',
      position: 'bottom',
      route: '/',
    },
    totalSteps: 3,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipTour: vi.fn(),
    completeTour: vi.fn(),
    restartTour: vi.fn(),
  }),
}));

import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

const criados: HTMLElement[] = [];

function campoDeCamadaAcima(): HTMLInputElement {
  const campo = document.createElement('input');
  campo.setAttribute('data-camada', 'spotlight');
  document.body.appendChild(campo);
  criados.push(campo);
  return campo;
}

afterEach(() => {
  while (criados.length) criados.pop()?.remove();
});

describe('tour x camada aberta acima dele', () => {
  it('não rouba o Tab de um campo focado fora do diálogo', () => {
    render(<MemoryRouter><OnboardingTour /></MemoryRouter>);
    const dialogo = screen.getByRole('dialog');

    const busca = campoDeCamadaAcima();
    busca.focus();
    expect(document.activeElement).toBe(busca);

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tab);

    // O trap tem de deixar o navegador seguir: foco continua na camada de cima
    // e o evento não é cancelado.
    expect(tab.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(busca);
    expect(dialogo.contains(document.activeElement)).toBe(false);
  });

  it('ainda traz o foco de volta quando ninguém o tem', () => {
    render(<MemoryRouter><OnboardingTour /></MemoryRouter>);
    const dialogo = screen.getByRole('dialog');

    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();

    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tab);

    expect(tab.defaultPrevented).toBe(true);
    expect(dialogo.contains(document.activeElement)).toBe(true);
  });
});
