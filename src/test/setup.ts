import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Define globally needed variables for backend client tests.
(globalThis as any).__PORTAL_SICOOB_RUNTIME_CONFIG__ = {
  url: 'https://mock.supabase.co',
  publishableKey: 'mock-key',
};

// jsdom does not implement ResizeObserver, which cmdk/Radix components rely on.
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});