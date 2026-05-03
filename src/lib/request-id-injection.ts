import { v4 as uuidv4 } from 'uuid';

/**
 * request-id-injection.ts
 * 
 * Monkey-patches window.fetch to ensure every outgoing request to our
 * backend (Supabase/Edge Functions) includes a unique X-Request-Id header.
 * 
 * This enables cross-stack traceability (Client -> Edge -> DB).
 */

const originalFetch = window.fetch;

export function injectRequestId() {
  window.fetch = async (...args) => {
    const [resource, config] = args;
    
    // Only inject for our own domain / Supabase domain
    const url = typeof resource === 'string' ? resource : resource instanceof URL ? resource.toString() : resource.url;
    const isSupabase = url.includes('supabase.co') || url.includes('.lovable.app/functions/');

    if (isSupabase) {
      const requestId = uuidv4();
      const newConfig = { ...(config || {}) };
      
      const headers = new Headers(newConfig.headers || {});
      if (!headers.has('X-Request-Id')) {
        headers.set('X-Request-Id', requestId);
      }
      
      newConfig.headers = headers;
      return originalFetch(resource, newConfig);
    }

    return originalFetch(...args);
  };
}
