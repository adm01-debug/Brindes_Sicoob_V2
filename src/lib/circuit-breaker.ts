
/**
 * Generic Circuit Breaker implementation to prevent overwhelming failing services.
 * Can be used for Edge Functions, external APIs, etc.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  onStateChange?: (state: CircuitState) => void;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: CircuitState = 'CLOSED';
  private name: string;
  private failureThreshold: number;
  private resetTimeout: number;
  private onStateChange?: (state: CircuitState) => void;

  constructor(name: string, options: CircuitBreakerOptions) {
    this.name = name;
    this.failureThreshold = options.failureThreshold;
    this.resetTimeout = options.resetTimeout;
    this.onStateChange = options.onStateChange;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === 'OPEN') {
      throw new Error(`Circuit breaker "${this.name}" is OPEN. Request blocked.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private evaluateState() {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeout) {
        this.setState('HALF_OPEN');
      }
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.lastFailureTime = null;
    if (this.state === 'HALF_OPEN') {
      this.setState('CLOSED');
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.setState('OPEN');
    }
  }

  private setState(newState: CircuitState) {
    if (this.state !== newState) {
      console.warn(`[CircuitBreaker] "${this.name}" changing state: ${this.state} -> ${newState}`);
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Singleton instances for common services
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker(name, {
      failureThreshold: options?.failureThreshold ?? 5,
      resetTimeout: options?.resetTimeout ?? 30000,
      onStateChange: options?.onStateChange,
    }));
  }
  return breakers.get(name)!;
}
