import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  buildSearchAnalyticsInsert,
  serializeSearchContext,
  useProductAnalytics,
} from '@/hooks/useProductAnalytics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import React from 'react';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useProductAnalytics', () => {
  it('should return analytics functions', async () => {
    const hookResult = renderHook(() => useProductAnalytics(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(hookResult.result.current).toBeDefined();
      expect(typeof hookResult.result.current.trackProductView).toBe('function');
      expect(typeof hookResult.result.current.trackSearch).toBe('function');
    });
  });

  it('monta a telemetria de busca com as colunas do contrato canônico', () => {
    expect(buildSearchAnalyticsInsert('usuario-1', {
      searchTerm: '  Caneca Sicoob  ',
      resultsCount: 12,
      filtersUsed: { categoria: 'canecas', quantidade: 50 },
    })).toEqual({
      search_term: 'caneca sicoob',
      results_count: 12,
      user_id: 'usuario-1',
      search_context: '{"categoria":"canecas","quantidade":50}',
    });
  });

  it('serializa valores bigint e degrada ciclos sem interromper a busca', () => {
    expect(serializeSearchContext({ quantidade: 10n })).toBe('{"quantidade":"10"}');

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(serializeSearchContext(circular)).toBe('{}');
  });
});
