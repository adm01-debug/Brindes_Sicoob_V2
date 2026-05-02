import { describe, it, expect } from 'vitest';
import { canSicoobTransitionTo, OrderStatus } from '../types/sicoob/orders';

describe('Sicoob Order Status Workflow', () => {
  it('should allow valid Sicoob transitions', () => {
    expect(canSicoobTransitionTo('draft', 'pending')).toBe(true);
    expect(canSicoobTransitionTo('pending', 'waiting_approval')).toBe(true);
    expect(canSicoobTransitionTo('confirmed', 'logistic')).toBe(true);
    expect(canSicoobTransitionTo('logistic', 'completed')).toBe(true);
  });

  it('should allow rejection and return to draft/pending', () => {
    expect(canSicoobTransitionTo('waiting_approval', 'rejected')).toBe(true);
    expect(canSicoobTransitionTo('rejected', 'draft')).toBe(true);
  });

  it('should block invalid Sicoob transitions', () => {
    expect(canSicoobTransitionTo('draft', 'completed')).toBe(false);
    expect(canSicoobTransitionTo('completed', 'draft')).toBe(false);
  });
});
