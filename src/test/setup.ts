import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Define globally needed variables for Supabase client
(globalThis as any).SUPABASE_URL = 'https://mock.supabase.co';
(globalThis as any).SUPABASE_PUBLISHABLE_KEY = 'mock-key';

afterEach(() => {
  cleanup();
});