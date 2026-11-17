import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRefetchOnRevision } from '@/pages/trends/use-refetch-on-revision';

describe('useRefetchOnRevision', () => {
  it('nao busca na montagem', () => {
    const refetch = vi.fn();
    renderHook(() => useRefetchOnRevision(3, true, refetch));
    expect(refetch).not.toHaveBeenCalled();
  });

  it('busca quando a revisao avanca com a consulta habilitada', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(
      (props: { revision: number }) => useRefetchOnRevision(props.revision, true, refetch),
      { initialProps: { revision: 0 } },
    );
    rerender({ revision: 1 });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('ignora a revisao enquanto a consulta esta desabilitada', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(
      (props: { revision: number }) => useRefetchOnRevision(props.revision, false, refetch),
      { initialProps: { revision: 0 } },
    );
    rerender({ revision: 1 });
    expect(refetch).not.toHaveBeenCalled();
  });
});