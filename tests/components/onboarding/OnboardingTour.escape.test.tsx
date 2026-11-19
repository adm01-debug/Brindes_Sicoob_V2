import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

const mocks = vi.hoisted(() => ({ skipTour: vi.fn() }));

vi.mock('@/contexts/OnboardingContext', () => ({
  useOnboardingContext: () => ({
    isLoading: false,
    showTour: true,
    setShowTour: vi.fn(),
    currentStep: 0,
    hasCompletedTour: false,
    currentStepData: {
      id: 'inicio',
      title: 'Bem-vindo',
      description: 'Conheça o portal.',
      targetSelector: '[data-tour-target]',
      position: 'bottom',
      route: '/',
    },
    totalSteps: 1,
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    skipTour: mocks.skipTour,
    completeTour: vi.fn(),
    restartTour: vi.fn(),
  }),
}));

describe('atalho Escape do onboarding', () => {
  beforeEach(() => mocks.skipTour.mockReset());

  it('pula o tour quando ele é a camada ativa', () => {
    render(<MemoryRouter><OnboardingTour /></MemoryRouter>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mocks.skipTour).toHaveBeenCalledTimes(1);
  });

  it('preserva o tour quando existe overlay interativo aberto', () => {
    render(
      <MemoryRouter>
        <div role="dialog" data-state="open">Diálogo</div>
        <OnboardingTour />
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mocks.skipTour).not.toHaveBeenCalled();
  });

  it('expõe semântica modal, descrição e foco inicial', () => {
    render(<MemoryRouter><OnboardingTour /></MemoryRouter>);
    const dialog = screen.getByRole('dialog', { name: 'Bem-vindo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Conheça o portal.');
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });
});
