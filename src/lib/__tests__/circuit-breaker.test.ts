import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker } from '../security/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should be CLOSED initially and allow requests', async () => {
    const breaker = new CircuitBreaker('test-breaker');
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await breaker.execute(mockFn);
    
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should open the circuit after enough failures', async () => {
    const failureThreshold = 3;
    const breaker = new CircuitBreaker('test-breaker', { failureThreshold });
    const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

    for (let i = 0; i < failureThreshold; i++) {
      await expect(breaker.execute(mockFn)).rejects.toThrow('fail');
    }

    expect(breaker.getState()).toBe('OPEN');
    await expect(breaker.execute(mockFn)).rejects.toThrow(/blocked/);
  });

  it('should transition to HALF_OPEN after cooldown', async () => {
    const cooldownPeriodMs = 1000;
    const breaker = new CircuitBreaker('test-breaker', { failureThreshold: 1, cooldownPeriodMs });
    const mockFn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(breaker.execute(mockFn)).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('OPEN');

    // Fast-forward time
    vi.advanceTimersByTime(cooldownPeriodMs + 1);

    // Next call should move it to HALF_OPEN (internally handled during execute)
    const successFn = vi.fn().mockResolvedValue('success');
    const result = await breaker.execute(successFn);
    
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('HALF_OPEN'); // With default successThreshold=2, 1 success = HALF_OPEN
  });

  it('should close the circuit after successThreshold is met in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker('test-breaker', { 
      failureThreshold: 1, 
      cooldownPeriodMs: 1000, 
      successThreshold: 2 
    });
    
    // 1. Open circuit
    await expect(breaker.execute(() => Promise.reject('fail'))).rejects.toBe('fail');
    expect(breaker.getState()).toBe('OPEN');

    // 2. Cooldown
    vi.advanceTimersByTime(1100);

    // 3. First success (HALF_OPEN)
    await breaker.execute(() => Promise.resolve('ok1'));
    expect(breaker.getState()).toBe('HALF_OPEN');

    // 4. Second success (CLOSED)
    await breaker.execute(() => Promise.resolve('ok2'));
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('should return to OPEN if a request fails in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker('test-breaker', { 
      failureThreshold: 1, 
      cooldownPeriodMs: 1000 
    });
    
    await expect(breaker.execute(() => Promise.reject('fail'))).rejects.toBe('fail');
    vi.advanceTimersByTime(1100);

    // Fails in HALF_OPEN
    await expect(breaker.execute(() => Promise.reject('fail again'))).rejects.toBe('fail again');
    expect(breaker.getState()).toBe('OPEN');
  });
});
