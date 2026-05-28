import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Define globally needed variables for Supabase client
(globalThis as any).SUPABASE_URL = 'https://mock.supabase.co';
(globalThis as any).SUPABASE_PUBLISHABLE_KEY = 'mock-key';

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