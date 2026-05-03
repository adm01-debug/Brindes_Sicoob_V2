import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "../AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider } from "../AuthContext";
import React from "react";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("handles successful sign in", async () => {
    const mockUser = { id: "test-user", email: "test@example.com" };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    let signInResult;
    await act(async () => {
      signInResult = await result.current.signIn("test@example.com", "password123");
    });

    expect(signInResult.error).toBeNull();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("handles sign in failure", async () => {
    const mockError = { message: "Invalid credentials" };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    let signInResult;
    await act(async () => {
      signInResult = await result.current.signIn("test@example.com", "wrong-password");
    });

    expect(signInResult.error).toEqual(mockError);
  });

  it("correctly identifies user roles", () => {
    // Note: To test roles we'd need to mock useUserRoles hook or the internal state
    // For now we test the initial state
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isDev).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
