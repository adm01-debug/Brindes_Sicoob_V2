import { renderHook } from "@testing-library/react";
import { useApprovalThreshold } from "../useApprovalThreshold";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
}));

describe("useApprovalThreshold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return threshold and calculate needsApproval correctly for Gerente PA", () => {
    // Setup mock for Gerente PA
    (useAuth as any).mockReturnValue({
      profile: { pa_id: "pa-123" },
      isGerentePa: true,
      isDev: false,
      isSupervisor: false,
    });

    // Setup mock for budget query (threshold = 1000)
    (useQuery as any).mockReturnValue({
      data: { limite_alcada: 1000 },
    });

    const { result } = renderHook(() => useApprovalThreshold());

    expect(result.current.threshold).toBe(1000);
    expect(result.current.needsApproval(500)).toBe(false);
    expect(result.current.needsApproval(1500)).toBe(true);
  });

  it("should bypass approval for Dev or Supervisor", () => {
    // Setup mock for Dev
    (useAuth as any).mockReturnValue({
      profile: { pa_id: "pa-123" },
      isGerentePa: false,
      isDev: true,
      isSupervisor: false,
    });

    (useQuery as any).mockReturnValue({
      data: { limite_alcada: 1000 },
    });

    const { result } = renderHook(() => useApprovalThreshold());

    expect(result.current.needsApproval(5000)).toBe(false); // Even way over threshold
  });

  it("should return 0 threshold if no profile or budget data", () => {
    (useAuth as any).mockReturnValue({
      profile: null,
      isGerentePa: true,
    });

    (useQuery as any).mockReturnValue({
      data: null,
    });

    const { result } = renderHook(() => useApprovalThreshold());

    expect(result.current.threshold).toBe(0);
    expect(result.current.needsApproval(1)).toBe(true); // Any amount needs approval if threshold is 0
  });
});
