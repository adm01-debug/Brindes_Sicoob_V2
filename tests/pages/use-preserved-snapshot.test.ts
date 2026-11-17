import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePreservedSnapshot } from '@/pages/trends/use-preserved-snapshot';

describe('snapshot preservado de tendências', () => {
  it('mantém o último snapshot quando a atualização da mesma janela falha', () => {
    const { result, rerender } = renderHook(
      ({ key, data }: { key: string; data: string | undefined }) => usePreservedSnapshot(key, data),
      { initialProps: { key: '30d|all', data: 'snapshot-30d' as string | undefined } },
    );

    expect(result.current).toBe('snapshot-30d');
    rerender({ key: '30d|all', data: undefined });
    expect(result.current).toBe('snapshot-30d');
  });

  it('descarta o snapshot ao trocar a janela para não distorcer as comparações', () => {
    const { result, rerender } = renderHook(
      ({ key, data }: { key: string; data: string | undefined }) => usePreservedSnapshot(key, data),
      { initialProps: { key: '30d|all', data: 'snapshot-30d' as string | undefined } },
    );

    rerender({ key: '7d|all', data: undefined });
    expect(result.current).toBeUndefined();
  });

  it('descarta o snapshot ao trocar o escopo de vendedor', () => {
    const { result, rerender } = renderHook(
      ({ key, data }: { key: string; data: string | undefined }) => usePreservedSnapshot(key, data),
      { initialProps: { key: '30d|all', data: 'snapshot-todos' as string | undefined } },
    );

    rerender({ key: '30d|vendedor-1', data: undefined });
    expect(result.current).toBeUndefined();
  });
});
