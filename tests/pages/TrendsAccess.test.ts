import { describe, expect, it } from 'vitest';
import { isTrendsAccessVisible, resolveTrendsAccessUiState } from '@/pages/TrendsPage';

describe('estado de acesso às tendências', () => {
  it('aguarda a primeira resposta de capacidades', () => {
    expect(isTrendsAccessVisible(false, false, 'unavailable')).toBe(false);
  });

  it('preserva o acesso comprovado por dados em cache durante atualizações', () => {
    expect(isTrendsAccessVisible(false, true, 'self')).toBe(true);
    expect(isTrendsAccessVisible(false, true, 'all')).toBe(true);
    expect(resolveTrendsAccessUiState({
      demo: false,
      hasUser: true,
      hasCapabilityData: true,
      isPending: false,
      isError: true,
      mode: 'self',
    })).toEqual({ visible: true, loading: false, error: false, queryEnabled: true });
  });
});
