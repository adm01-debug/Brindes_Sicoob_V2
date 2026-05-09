
import { describe, it, expect } from 'vitest';

interface StockCheckResult {
  isValid: boolean;
  message?: string;
  available?: number;
}

function validateStock(requested: number, available?: number | null): StockCheckResult {
  if (available === null || available === undefined) {
    return { isValid: true }; // No stock info available
  }
  if (requested > available) {
    return { 
      isValid: false, 
      message: `Estoque insuficiente: ${available} disponíveis`,
      available 
    };
  }
  return { isValid: true };
}

describe('Real-time Stock Validation', () => {
  it('allows requested quantity when stock is sufficient', () => {
    const result = validateStock(50, 100);
    expect(result.isValid).toBe(true);
  });

  it('allows requested quantity when stock info is missing', () => {
    const result = validateStock(50, null);
    expect(result.isValid).toBe(true);
  });

  it('rejects requested quantity when stock is insufficient', () => {
    const result = validateStock(150, 100);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain('insuficiente');
    expect(result.available).toBe(100);
  });

  it('allows quantity exactly equal to stock', () => {
    const result = validateStock(100, 100);
    expect(result.isValid).toBe(true);
  });
});
