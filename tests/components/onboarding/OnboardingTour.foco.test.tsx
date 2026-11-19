/**
 * Regressão: `key={currentStep}` remonta o diálogo a cada passo, levando junto
 * o botão focado. O efeito de foco dependia só de `showTour` e não rodava de
 * novo — o teclado saía do modal e alcançava a página atrás dele.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ currentStep: 0 }));

vi.mock('@/contexts/OnboardingContext', () => ({
  useOnboardingContext: () => ({
    isLoading: false,
    showTour: true,
    setShowTour: vi.fn(),
    currentStep: mocks.currentStep,
    hasCompletedTour: false,
    currentStepData: {
      id: `passo-${mocks.currentStep}`,
      title: `Passo ${mocks.currentStep + 1}`,
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

describe('foco do tour ao trocar de passo', () => {
  beforeEach(() => { mocks.currentStep = 0; });

  it('o diálogo mantém o foco depois de avançar', () => {
    const { rerender } = render(<MemoryRouter><OnboardingTour /></MemoryRouter>);

    const dialogo = screen.getByRole('dialog');
    expect(dialogo.contains(document.activeElement)).toBe(true);

    mocks.currentStep = 1;
    rerender(<MemoryRouter><OnboardingTour /></MemoryRouter>);

    const novoDialogo = screen.getByRole('dialog');
    expect(novoDialogo.textContent).toContain('Passo 2');
    expect(novoDialogo.contains(document.activeElement)).toBe(true);
  });
});
