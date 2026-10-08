
/**
 * Diagnostic utility to track application performance, API calls, and state transitions.
 * Helps identifying where the application might be "stuck" or "hanging".
 */

const browserConsole = globalThis.console;

export interface DiagnosticLog {
  timestamp: number;
  type: 'info' | 'error' | 'request' | 'response' | 'event' | 'performance' | 'security';
  source: string;
  message: string;
  data?: unknown;
  duration?: number;
}

export interface AppHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  latency: number;
  errorRate: number;
  uptime: number;
  lastCheck: number;
}

export class DiagnosticsManager {
  private logs: DiagnosticLog[] = [];
  private maxLogs = 1000;
  private subscribers: ((log: DiagnosticLog) => void)[] = [];
  private metrics = {
    totalRequests: 0,
    failedRequests: 0,
    latencySum: 0,
    startTime: Date.now()
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.__DIAGNOSTICS__ = this;
      browserConsole.log('🔍 Sicoob Diagnostic Engine v2 initialized. [OND-018-HEALTH]');
    }
  }

  log(
    type: DiagnosticLog['type'],
    source: string,
    message: string,
    ...details: [data?: unknown, duration?: number]
  ) {
    const [data, duration] = details;
    const log: DiagnosticLog = {
      timestamp: Date.now(),
      type,
      source,
      message,
      data,
      duration
    };

    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Output to console in development
    if (import.meta.env.DEV) {
      const color = this.getTypeColor(type);
      browserConsole.log(
        `%c[${source}] %c${message} ${duration ? `(${duration.toFixed(0)}ms)` : ''}`, 
        `color: #00334e; font-weight: bold;`, 
        `color: ${color}; font-weight: 500;`, 
        data || ''
      );
    }

    this.subscribers.forEach(sub => sub(log));
  }

  private getTypeColor(type: DiagnosticLog['type']) {
    switch (type) {
      case 'error': return '#ef4444';
      case 'request': return '#3b82f6';
      case 'response': return '#10b981';
      case 'event': return '#f59e0b';
      case 'performance': return '#8b5cf6';
      case 'security': return '#00334e';
      default: return '#6b7280';
    }
  }

  getLogs() {
    return [...this.logs];
  }

  getHealthStatus(): AppHealthStatus {
    const avgLatency = this.metrics.totalRequests > 0 
      ? this.metrics.latencySum / this.metrics.totalRequests 
      : 0;
    const errorRate = this.metrics.totalRequests > 0 
      ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100 
      : 0;
    
    let status: AppHealthStatus['status'] = 'healthy';
    if (errorRate > 10 || avgLatency > 2000) status = 'critical';
    else if (errorRate > 2 || avgLatency > 800) status = 'degraded';

    return {
      status,
      latency: Math.round(avgLatency),
      errorRate: Math.round(errorRate * 10) / 10,
      uptime: (Date.now() - this.metrics.startTime) / 1000,
      lastCheck: Date.now()
    };
  }

  clearLogs() {
    this.logs = [];
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      latencySum: 0,
      startTime: Date.now()
    };
  }

  subscribe(callback: (log: DiagnosticLog) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  setupFetchInterceptor() {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = (args[1]?.method || 'GET').toUpperCase();
      
      this.metrics.totalRequests++;
      this.log('request', 'fetch', `${method} ${url}`);
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        this.metrics.latencySum += duration;

        if (!response.ok) {
          this.metrics.failedRequests++;
          // Em preview, se houver erro 412 (Precondition Failed), forçar reload
          if (response.status === 412 && import.meta.env.VITE_LOVABLE_PREVIEW) {
            console.warn('[OND-018-HEALTH] Erro 412 detectado em fetch, acionando auto-reload...');
            try {
              const { attemptChunkRecovery } = await import('@/lib/chunk-recovery');
              attemptChunkRecovery('Precondition Failed (412)');
            } catch {
              window.location.reload();
            }
          }
        }

        this.log(
          response.ok ? 'response' : 'error', 
          'fetch', 
          `${response.status} ${url}`,
          { status: response.status },
          duration
        );
        
        return response;
      } catch (error) {
        this.metrics.failedRequests++;
        const duration = performance.now() - startTime;
        this.log('error', 'fetch', `Failed ${url}`, error, duration);
        throw error;
      }
    };
  }
}

export const diagnostics = new DiagnosticsManager();

// Only enable in production or specific debug mode
if (typeof window !== 'undefined' && 
    ((import.meta.env.PROD && !import.meta.env.VITE_LOVABLE_PREVIEW) || 
     localStorage.getItem('DEBUG_FETCH') === 'true' ||
     import.meta.env.VITE_LOVABLE_PREVIEW)) {
  diagnostics.setupFetchInterceptor();
}
