import { diagnostics } from "@/lib/diagnostics";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  serviceName: string;
}

/**
 * CircuitBreaker protects the system from cascading failures by
 * stopping execution of failing services temporarily.
 * Refactored for Sicoob OND-019-RESIL with diagnostic integration.
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures = 0;
  private lastFailureTime?: number;
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> & { serviceName: string }) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 3,
      resetTimeoutMs: options.resetTimeoutMs ?? 30000,
      serviceName: options.serviceName
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    if (this.state === "OPEN") {
      if (Date.now() - (this.lastFailureTime || 0) > this.options.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        diagnostics.log('event', `Resilience:${this.options.serviceName}`, "Circuit entering HALF_OPEN - testing connection");
      } else {
        diagnostics.log('error', `Resilience:${this.options.serviceName}`, "Execution blocked - Circuit is OPEN");
        throw new Error(`[Sicoob Resilience] O circuito para ${this.options.serviceName} está aberto. Tente novamente em instantes.`);
      }
    }

    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.onSuccess(duration);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.onFailure(error, duration);
      throw error;
    }
  }

  private onSuccess(duration: number) {
    if (this.state === "HALF_OPEN") {
      diagnostics.log('event', `Resilience:${this.options.serviceName}`, "Service restored - Closing circuit", { duration });
    }
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure(error: any, duration: number) {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    diagnostics.log('error', `Resilience:${this.options.serviceName}`, `Execution failed (${this.failures}/${this.options.failureThreshold})`, { 
      error: error?.message || error,
      duration 
    });

    if (this.failures >= this.options.failureThreshold) {
      this.state = "OPEN";
      diagnostics.log('error', `Resilience:${this.options.serviceName}`, "CRITICAL: failureThreshold reached. Circuit is now OPEN.");
      
      // Notify system about degraded service
      window.dispatchEvent(new CustomEvent('sicoob-service-degraded', { 
        detail: { service: this.options.serviceName, state: 'OPEN' } 
      }));
    }
  }

  getState() {
    return this.state;
  }
}

// Singleton instances for shared services with explicit names for Sicoob monitoring
export const bitrixCircuitBreaker = new CircuitBreaker({ serviceName: "Bitrix24_CRM" });
export const erpCircuitBreaker = new CircuitBreaker({ serviceName: "External_ERP" });
export const aiCircuitBreaker = new CircuitBreaker({ 
  serviceName: "Sicoob_AI_Gateway",
  failureThreshold: 2, 
  resetTimeoutMs: 15000 
});
export const databaseCircuitBreaker = new CircuitBreaker({ serviceName: "Sicoob_Main_DB" });
