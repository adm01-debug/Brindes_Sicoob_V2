import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Define globally needed variables for backend client tests.
type TestRuntimeGlobal = typeof globalThis & {
  __PORTAL_SICOOB_RUNTIME_CONFIG__?: {
    url: string;
    publishableKey: string;
  };
};

(globalThis as TestRuntimeGlobal).__PORTAL_SICOOB_RUNTIME_CONFIG__ = {
  url: 'https://mock.supabase.co',
  publishableKey: 'mock-key',
};

// jsdom does not implement ResizeObserver, which cmdk/Radix components rely on.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class TestResizeObserver implements ResizeObserver {
    observe(_target: Element, _options?: ResizeObserverOptions): void {}
    unobserve(_target: Element): void {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});
