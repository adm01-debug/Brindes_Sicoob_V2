/**
 * Circuit Breaker pattern implementation to protect the system from cascading failures.
 * 
 * States:
 * - CLOSED: Normal operation. Requests go through.
 * - OPEN: Failure threshold reached. Requests are blocked for a cooldown period.
 * - HALF_OPEN: Cooldown finished. Testing if the service is back.
 */

import { logger } from "@/lib/logger";

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownPeriodMs: number;
  successThreshold: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private name: string;
  private options: CircuitBreakerOptions;

  constructor(name: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.name = name;
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      cooldownPeriodMs: options.cooldownPeriodMs ?? 30000,
      successThreshold: options.successThreshold ?? 2,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state === 'OPEN') {
      throw new Error(`Circuit Breaker [${this.name}] is OPEN. Request blocked.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private updateState() {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.options.cooldownPeriodMs) {
        this.state = 'HALF_OPEN';
        logger.info(`[CircuitBreaker:${this.name}] State changed to HALF_OPEN`);
      }
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.reset();
        logger.info(`[CircuitBreaker:${this.name}] State changed to CLOSED (Service recovered)`);
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(error: unknown) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED') {
      if (this.failureCount >= this.options.failureThreshold) {
        this.state = 'OPEN';
        logger.error(`[CircuitBreaker:${this.name}] State changed to OPEN. Failure threshold reached: ${this.failureCount}`, error);
      }
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.error(`[CircuitBreaker:${this.name}] State reverted to OPEN after failure in HALF_OPEN`, error);
    }
  }

  private reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }

  getState() {
    return this.state;
  }
}
