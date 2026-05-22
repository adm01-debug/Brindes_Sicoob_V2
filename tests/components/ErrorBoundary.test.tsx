import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toast } from 'sonner';

// Mock structuredLogger
vi.mock('@/lib/telemetry/structuredLogger', () => ({
  createClientLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock error-reporter
vi.mock('@/lib/error-reporter', () => ({
  reportError: vi.fn(),
  isTransientEdgeRuntimeError: vi.fn(() => false),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// A component that throws an error on render
const Thrower = ({ error }: { error: Error }) => {
  throw error;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prevent vitest from failing the test on console.error when the ErrorBoundary catches the error
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders fallback UI when a render error occurs', () => {
    const error = new Error('Test Error');
    render(
      <ErrorBoundary>
        <Thrower error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument();
    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('handles ChunkLoadError specifically', () => {
    const error = new Error('Loading chunk 123 failed');
    error.name = 'ChunkLoadError';
    
    render(
      <ErrorBoundary>
        <Thrower error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Atualização Necessária/i)).toBeInTheDocument();
    expect(screen.getByText(/Tentar Novamente/i)).toBeInTheDocument();
  });

  it('copies error details to clipboard', async () => {
    const error = new Error('Copy Error');
    // Mock clipboard API
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ErrorBoundary>
        <Thrower error={error} />
      </ErrorBoundary>
    );

    const copyButton = screen.getByText(/Copiar Detalhes/i);
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Detalhes do erro copiados!');
    });
    expect(screen.getByText(/Copiado/i)).toBeInTheDocument();
  });

  it('attempts recovery when "Tentar Novamente" is clicked', () => {
    const error = new Error('Recover Error');
    const { rerender } = render(
      <ErrorBoundary>
        <Thrower error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument();

    const retryButton = screen.getByText(/Tentar Novamente/i);
    fireEvent.click(retryButton);

    // After reset, if it still throws, it shows again, but the internal state was cleared
    // In a real app, you might fix the condition that caused the error
    expect(screen.getByText(/Ops! Algo deu errado/i)).toBeInTheDocument();
  });
});
