import { describe, expect, it } from 'vitest';
import { buildQuoteDraftScope } from '@/lib/quotes/quote-draft-scope';

describe('buildQuoteDraftScope', () => {
  it('sem usuario autenticado nao gera escopo', () => {
    expect(buildQuoteDraftScope(undefined, 'coop-1', 'pa-1')).toBeNull();
    expect(buildQuoteDraftScope(null, 'coop-1', 'pa-1')).toBeNull();
  });

  it('separa rascunhos do mesmo usuario em PAs diferentes', () => {
    const paA = buildQuoteDraftScope('user-1', 'coop-1', 'pa-1');
    const paB = buildQuoteDraftScope('user-1', 'coop-1', 'pa-2');
    expect(paA).not.toBe(paB);
    expect(paA).toBe('user-1:coop-1:pa-1');
  });

  it('separa rascunhos entre cooperativas diferentes', () => {
    expect(buildQuoteDraftScope('user-1', 'coop-1', 'pa-1')).not.toBe(
      buildQuoteDraftScope('user-1', 'coop-2', 'pa-1'),
    );
  });

  it('usa marcadores estaveis quando cooperativa ou PA estao ausentes', () => {
    expect(buildQuoteDraftScope('user-1')).toBe('user-1:sem-cooperativa:sem-pa');
    expect(buildQuoteDraftScope('user-1', null, null)).toBe('user-1:sem-cooperativa:sem-pa');
  });
});