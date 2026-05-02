import { renderHook, act } from "@testing-library/react";
import { useOrderLogistics } from "../useOrderExtensions";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "123", carrier: "Test" }, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useOrderLogistics", () => {
  it("should fetch logistics data correctly", async () => {
    const { result } = renderHook(() => useOrderLogistics("order-123"), { wrapper });
    
    // Initial loading state
    expect(result.current.isLoading).toBe(true);
    
    // Wait for query to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    
    expect(result.current.logistics).toEqual({ id: "123", carrier: "Test" });
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle update mutation", async () => {
    const { result } = renderHook(() => useOrderLogistics("order-123"), { wrapper });
    
    await act(async () => {
      result.current.updateLogistics.mutate({ carrier: "New Carrier" });
    });
    
    expect(supabase.from).toHaveBeenCalledWith("order_logistics");
  });
});
