import { beforeEach, describe, expect, it } from 'vitest';
import { getUxMetrics, resetUxMetrics, trackUx } from '@/lib/uxMetrics';

describe('métricas de navegação e guarda', () => {
  beforeEach(resetUxMetrics);

  it('conta eventos por sessão e expõe uma cópia serializável', () => {
    trackUx('nav.back');
    trackUx('nav.back');
    trackUx('guard.cancel', { nextPath: '/pedidos' });

    expect(getUxMetrics()).toEqual({
      'nav.back': 2,
      'guard.cancel': 1,
    });
    expect(window.__UX_METRICS__?.()).toEqual(getUxMetrics());
  });
});
