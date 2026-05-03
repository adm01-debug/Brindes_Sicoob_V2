type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
}

/**
 * CircuitBreaker protects the system from cascading failures by
 * stopping execution of failing services temporarily.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime?: number;
  private options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions = { failureThreshold: 3, resetTimeoutMs: 30000 }) {
    this.options = options;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - (this.lastFailureTime || 0) > this.options.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        console.warn("[CircuitBreaker] Testing connection in HALF_OPEN state");
      } else {
        throw new Error("Circuit is OPEN - Service temporarily unavailable");
      }
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

  private onSuccess() {
    if (this.state === "HALF_OPEN") {
      console.log("[CircuitBreaker] Service restored, closing circuit");
    }
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.options.failureThreshold) {
      this.state = "OPEN";
      console.error(`[CircuitBreaker] failureThreshold reached (${this.failures}). Circuit is now OPEN.`);
    }
  }

  getState() {
    return this.state;
  }
}

// Singleton instances for shared services
export const bitrixCircuitBreaker = new CircuitBreaker();
export const erpCircuitBreaker = new CircuitBreaker();
export const aiCircuitBreaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 10000 });
