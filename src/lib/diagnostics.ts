
/**
 * Diagnostic utility to track application performance, API calls, and state transitions.
 * Helps identifying where the application might be "stuck" or "hanging".
 */

export interface DiagnosticLog {
  timestamp: number;
  type: 'info' | 'error' | 'request' | 'response' | 'event';
  source: string;
  message: string;
  data?: any;
}

class DiagnosticsManager {
  private logs: DiagnosticLog[] = [];
  private maxLogs = 500;
  private subscribers: ((log: DiagnosticLog) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.__DIAGNOSTICS__ = this;
      console.log('🔍 Diagnostic mode initialized. Access window.__DIAGNOSTICS__.getLogs()');
    }
  }

  log(type: DiagnosticLog['type'], source: string, message: string, data?: any) {
    const log: DiagnosticLog = {
      timestamp: Date.now(),
      type,
      source,
      message,
      data
    };

    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    // Output to console in development
    if (import.meta.env.DEV) {
      const color = this.getTypeColor(type);
      console.log(
        `%c[${source}] %c${message}`, 
        `color: #888; font-weight: bold;`, 
        `color: ${color};`, 
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
      default: return '#6b7280';
    }
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  subscribe(callback: (log: DiagnosticLog) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  /**
   * Intercepts fetch calls to log request/response cycles
   */
  setupFetchInterceptor() {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const method = (args[1]?.method || 'GET').toUpperCase();
      
      this.log('request', 'fetch', `${method} ${url}`);
      
      try {
        const response = await originalFetch(...args);
        const clone = response.clone();
        
        // Try to parse JSON if possible, but don't fail if not
        let body;
        try {
          body = await clone.json();
        } catch {
          body = 'non-json response';
        }

        this.log(
          response.ok ? 'response' : 'error', 
          'fetch', 
          `${response.status} ${url}`,
          { status: response.status, body }
        );
        
        return response;
      } catch (error) {
        this.log('error', 'fetch', `Failed ${url}`, error);
        
        // Signal critical 500 error if it's a critical route or status
        if (url.includes('/api/') || url.includes('/functions/')) {
          window.dispatchEvent(new CustomEvent('app-critical-error', { 
            detail: { 
              message: `Erro de rede ou servidor ao acessar ${url.split('/').pop()}`,
              error,
              type: 'server'
            } 
          }));
        }
        
        throw error;
      }
    };
  }
}

export const diagnostics = new DiagnosticsManager();

// Initialize fetch interceptor immediately
diagnostics.setupFetchInterceptor();
