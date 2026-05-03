import { describe, it, expect, vi, beforeEach } from "vitest";
import { sicoobOrderService } from "./orderService";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe("sicoobOrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when user is not authenticated", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null }, error: null });

    await expect(sicoobOrderService.getOrderById("1")).rejects.toThrow("Usuário não autenticado");
  });

  it("calls supabase when authenticated", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: "123" } }, error: null });
    
    const mockOrder = { id: "1", status: "pending" };
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockOrder, error: null })
        })
      })
    });
    (supabase.from as any) = fromMock;

    const result = await sicoobOrderService.getOrderById("1");
    expect(result).toEqual(mockOrder);
    expect(fromMock).toHaveBeenCalledWith("sicoob_orders");
  });
});
