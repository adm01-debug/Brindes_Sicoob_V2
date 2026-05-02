import { describe, it, expect } from 'vitest';
import { canTransitionTo } from './useOrders';

describe('Order Status Workflow', () => {
  it('should allow valid transitions', () => {
    expect(canTransitionTo('pending', 'waiting_approval')).toBe(true);
    expect(canTransitionTo('confirmed', 'in_production')).toBe(true);
    expect(canTransitionTo('in_transit', 'delivered')).toBe(true);
    expect(canTransitionTo('delivered', 'completed')).toBe(true);
  });

  it('should allow cancelling from initial stages', () => {
    expect(canTransitionTo('pending', 'cancelled')).toBe(true);
    expect(canTransitionTo('confirmed', 'cancelled')).toBe(true);
    expect(canTransitionTo('in_production', 'cancelled')).toBe(true);
  });

  it('should block invalid transitions', () => {
    expect(canTransitionTo('pending', 'delivered')).toBe(false);
    expect(canTransitionTo('completed', 'pending')).toBe(false);
    expect(canTransitionTo('cancelled', 'pending')).toBe(false);
  });

  it('should allow staying in the same status', () => {
    expect(canTransitionTo('pending', 'pending')).toBe(true);
    expect(canTransitionTo('completed', 'completed')).toBe(true);
  });
});
