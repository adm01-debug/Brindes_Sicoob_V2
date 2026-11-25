import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateStatus: vi.fn() }));

vi.mock('@/services/quoteStatusTransition', () => ({
  updateQuoteStatusAtomically: mocks.updateStatus,
}));

import { ReopenExpiredQuoteButton } from '@/components/quotes/ReopenExpiredQuoteButton';

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderAction(props: Partial<ComponentProps<typeof ReopenExpiredQuoteButton>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/orcamentos/quote-1']}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <ReopenExpiredQuoteButton quoteId="quote-1" status="expired" {...props} />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReopenExpiredQuoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateStatus.mockResolvedValue({ id: 'quote-1', row_version: 3, status: 'draft' });
  });

  it('reabre atomicamente antes de navegar para o editor', async () => {
    const onReopened = vi.fn();
    // Promessa controlada: o mock resolvido na hora não distingue navegar antes
    // ou depois da confirmação, que é justamente o contrato do componente.
    let liberar: (quote: unknown) => void = () => {};
    mocks.updateStatus.mockImplementation(
      () => new Promise((resolve) => { liberar = resolve; }),
    );
    renderAction({ onReopened });

    fireEvent.click(screen.getByRole('button', { name: /reabrir e editar/i }));

    await waitFor(() =>
      expect(mocks.updateStatus).toHaveBeenCalledWith(
        'quote-1',
        'draft',
        expect.stringMatching(/reaberto para revisão/i),
      ),
    );
    // Transição segura: enquanto a promessa não resolve, o usuário continua na
    // visualização. A comparação é exata (`textContent`) porque a rota nova
    // contém a antiga como prefixo e `toHaveTextContent` passaria nos dois
    // casos, sem provar ordem nenhuma.
    expect(screen.getByTestId('location').textContent).toBe('/orcamentos/quote-1');
    expect(onReopened).not.toHaveBeenCalled();

    liberar({ id: 'quote-1', row_version: 3, status: 'draft' });

    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/orcamentos/quote-1/editar'),
    );
    expect(onReopened).toHaveBeenCalledTimes(1);
  });

  it('não oferece reabertura para uma versão histórica', () => {
    renderAction({ isLatestVersion: false });
    expect(screen.queryByRole('button', { name: /reabrir e editar/i })).not.toBeInTheDocument();
  });

  it('permanece na visualização quando a transição falha', async () => {
    mocks.updateStatus.mockRejectedValue(new Error('transição inválida'));
    renderAction();

    fireEvent.click(screen.getByRole('button', { name: /reabrir e editar/i }));

    await waitFor(() => expect(mocks.updateStatus).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('location')).toHaveTextContent('/orcamentos/quote-1');
  });
});
