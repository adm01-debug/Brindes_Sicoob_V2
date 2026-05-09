
import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals, calculateItemTotal, calculateItemCost } from '../quote-calculations';
import { QuoteItem } from '@/hooks/useQuotes';

describe('Quote Calculations', () => {
  const mockItems: QuoteItem[] = [
    {
      product_id: 'p1',
      product_name: 'Product 1',
      quantity: 10,
      unit_price: 100,
      unit_cost: 70,
      personalizations: []
    },
    {
      product_id: 'p2',
      product_name: 'Product 2',
      quantity: 5,
      unit_price: 200,
      unit_cost: 140,
      personalizations: [
        {
          technique_id: 't1',
          technique_name: 'Laser',
          unit_cost: 5,
          setup_cost: 50,
          total_cost: 100, // 5*10 + 50
          personalized_quantity: 10
        }
      ]
    }
  ];

  it('calculates item total correctly', () => {
    const item1 = mockItems[0];
    expect(calculateItemTotal(item1)).toBe(1000); // 10 * 100

    const item2 = mockItems[1];
    expect(calculateItemTotal(item2)).toBe(1100); // 5 * 200 + 100 (personalization total_cost)
  });

  it('calculates item cost correctly', () => {
    const item1 = mockItems[0];
    expect(calculateItemCost(item1)).toBe(700); // 10 * 70

    const item2 = mockItems[1];
    // Cost = (unit_cost * qty) + (pers_unit_cost * pers_qty) + pers_setup
    // 140 * 5 + 5 * 10 + 50 = 700 + 50 + 50 = 800
    expect(calculateItemCost(item2)).toBe(800);
  });

  it('calculates quote totals and profitability correctly', () => {
    const result = calculateQuoteTotals(mockItems, 10, 'percent', 5);
    
    // realSubtotal = 1000 + 1100 = 2100
    // totalCost = 700 + 800 = 1500
    // markup = 10%
    // subtotal (apparent) = 2100 * 1.1 = 2310
    // discount = 5% of 2310 = 115.5
    // total = 2310 - 115.5 = 2194.5
    // profit = 2194.5 - 1500 = 694.5
    // marginPercent = (694.5 / 2194.5) * 100 approx 31.6%

    expect(result.realSubtotal).toBe(2100);
    expect(result.totalCost).toBe(1500);
    expect(result.subtotal).toBe(2310);
    expect(result.total).toBe(2194.5);
    expect(result.profit).toBe(694.5);
    expect(Math.round(result.marginPercent)).toBe(32);
  });

  it('handles absolute discounts correctly', () => {
    const result = calculateQuoteTotals(mockItems, 0, 'amount', 100);
    // subtotal = 2100
    // total = 2100 - 100 = 2000
    // profit = 2000 - 1500 = 500
    expect(result.total).toBe(2000);
    expect(result.profit).toBe(500);
  });
});
