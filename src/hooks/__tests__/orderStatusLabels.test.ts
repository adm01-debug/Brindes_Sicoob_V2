import { describe, it, expect } from 'vitest';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, FULFILLMENT_LABELS, type OrderStatus } from '../useOrders';

describe('Order Status Labels Validation', () => {
  it('should have labels for all order status flow values', () => {
    ORDER_STATUS_FLOW.forEach((status: OrderStatus) => {
      expect(ORDER_STATUS_LABELS[status], `Label missing for status: ${status}`).toBeDefined();
      expect(typeof ORDER_STATUS_LABELS[status]).toBe('string');
      expect(ORDER_STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it('should have labels for all fulfillment status values', () => {
    ORDER_STATUS_FLOW.forEach((status: OrderStatus) => {
      expect(FULFILLMENT_LABELS[status], `Fulfillment label missing for status: ${status}`).toBeDefined();
      expect(typeof FULFILLMENT_LABELS[status]).toBe('string');
      expect(FULFILLMENT_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it('ORDER_STATUS_LABELS should exactly match OrderStatus type', () => {
    const labelKeys = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
    expect(labelKeys.length).toBe(ORDER_STATUS_FLOW.length);
    
    ORDER_STATUS_FLOW.forEach(status => {
      expect(labelKeys).toContain(status);
    });
  });
});
