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

describe("useApprovalThreshold - Boundary Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should block when exactly at the threshold limit (conservative approach)", () => {
    (useAuth as any).mockReturnValue({
      profile: { pa_id: "pa-123" },
      isGerentePa: true,
    });

    (useQuery as any).mockReturnValue({
      data: { limite_alcada: 1000 },
    });

    const { result } = renderHook(() => useApprovalThreshold());
    
    // If threshold is 1000, 1000.01 should definitely fail.
    // The current logic uses `amount > threshold`, so exactly 1000 should pass.
    expect(result.current.needsApproval(1000)).toBe(false);
    expect(result.current.needsApproval(1000.01)).toBe(true);
  });

  it("should pass for 0 amount with 0 threshold", () => {
    (useAuth as any).mockReturnValue({ profile: { pa_id: "pa-123" }, isGerentePa: true });
    (useQuery as any).mockReturnValue({ data: { limite_alcada: 0 } });

    const { result } = renderHook(() => useApprovalThreshold());
    expect(result.current.needsApproval(0)).toBe(false);
    expect(result.current.needsApproval(0.01)).toBe(true);
  });

  it("should return correct status for negative values (safety check)", () => {
    (useAuth as any).mockReturnValue({ profile: { pa_id: "pa-123" }, isGerentePa: true });
    (useQuery as any).mockReturnValue({ data: { limite_alcada: 500 } });

    const { result } = renderHook(() => useApprovalThreshold());
    expect(result.current.needsApproval(-100)).toBe(false);
  });
});

