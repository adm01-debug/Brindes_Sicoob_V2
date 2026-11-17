import { afterEach, describe, expect, it } from 'vitest';
import { isDemoMode } from '@/pages/trends/is-demo-mode';

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('isDemoMode', () => {
  it('uses real data by default', () => {
    window.history.replaceState({}, '', '/tendencias');

    expect(isDemoMode()).toBe(false);
  });

  it('enables illustrative data only when explicitly requested', () => {
    window.history.replaceState({}, '', '/tendencias?demo=1');

    expect(isDemoMode()).toBe(true);
  });

  it('keeps real data when demo is explicitly disabled', () => {
    window.history.replaceState({}, '', '/tendencias?demo=0');

    expect(isDemoMode()).toBe(false);
  });
});
