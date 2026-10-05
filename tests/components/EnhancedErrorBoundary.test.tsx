import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EnhancedErrorBoundary from '@/components/errors/EnhancedErrorBoundary';

const { reportErrorMock } = vi.hoisted(() => ({
  reportErrorMock: vi.fn(),
}));

vi.mock('@/lib/error-reporter', () => ({
  reportError: reportErrorMock,
}));

vi.mock('@/lib/chunk-recovery', () => ({
  attemptChunkRecovery: vi.fn().mockResolvedValue(false),
  isChunkLoadError: vi.fn(() => false),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}));

function ThrowOnRender(): never {
  throw new Error('falha controlada');
}

describe('EnhancedErrorBoundary', () => {
  beforeEach(() => {
    reportErrorMock.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('carrega o reporter sob demanda quando captura uma falha de renderização', async () => {
    render(
      <EnhancedErrorBoundary fallback={<div>fallback seguro</div>}>
        <ThrowOnRender />
      </EnhancedErrorBoundary>,
    );

    await waitFor(() => {
      expect(reportErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'falha controlada' }),
        expect.objectContaining({ type: 'react_error_boundary' }),
      );
    });
  });
});
