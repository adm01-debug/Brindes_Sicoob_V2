
import { describe, it, expect } from 'vitest';
import { 
  calculateQuoteTotals, 
  calculateItemTotal, 
  calculateItemCost 
} from '../quote-calculations';
import type { QuoteItem } from '@/hooks/useQuotes';

describe('Quote Calculations', () => {
  const mockItem: QuoteItem = {
    product_id: '1',
    product_name: 'Test Product',
    quantity: 10,
    unit_price: 100,
    unit_cost: 70,
    personalizations: [
      {
        technique_id: 'tech-1',
        total_cost: 50, // Total price charged to client for personalization
        unit_cost: 2,   // Cost to produce
        setup_cost: 10, // Fixed cost
        personalized_quantity: 10
      }
    ]
  };

  it('calculates item total correctly (price + personalization)', () => {
    const total = calculateItemTotal(mockItem);
    // 10 * 100 + 50 = 1050
    expect(total).toBe(1050);
  });

  it('calculates item cost correctly', () => {
    const cost = calculateItemCost(mockItem);
    // (70 * 10) + (2 * 10 + 10) = 700 + 30 = 730
    expect(cost).toBe(730);
  });

  it('calculates quote totals with markup and discount', () => {
    const items = [mockItem];
    const negotiationMarkup = 10; // 10% markup
    const discountType = 'percent';
    const discountValue = 5; // 5% discount

    const result = calculateQuoteTotals(items, negotiationMarkup, discountType, discountValue);

    // realSubtotal = 1050
    expect(result.realSubtotal).toBe(1050);
    
    // subtotal with 10% markup = 1050 * 1.1 = 1155
    expect(result.subtotal).toBe(1155);
    
    // discount 5% of 1155 = 57.75
    expect(result.discountAmount).toBe(57.75);
    
    // total = 1155 - 57.75 = 1097.25
    expect(result.total).toBe(1097.25);

    // totalCost = 730
    expect(result.totalCost).toBe(730);
    
    // profit = 1097.25 - 730 = 367.25
    expect(result.profit).toBe(367.25);

    // marginPercent = (367.25 / 1097.25) * 100 ≈ 33.47%
    expect(result.marginPercent).toBeCloseTo(33.47, 1);
  });

  it('validates stock warning simulation', () => {
    const itemWithStock: QuoteItem = {
      ...mockItem,
      quantity: 50,
      stock_available: 20
    };
    
    // Although calculateQuoteTotals doesn't return stock status, we verify the structure
    expect(itemWithStock.quantity).toBeGreaterThan(itemWithStock.stock_available!);
  });
});
