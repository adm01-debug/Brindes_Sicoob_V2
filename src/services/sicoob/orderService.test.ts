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
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

describe("sicoobOrderService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error and does not call database when user is not authenticated", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null }, error: null });
    const fromSpy = vi.spyOn(supabase, "from");

    await expect(sicoobOrderService.getOrderById("1")).rejects.toThrow("Usuário não autenticado");
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it("calls supabase when authenticated", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: "123" } }, error: null });
    
    const mockOrder = { id: "1", status: "pending" };
    const selectMock = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockOrder, error: null })
    };
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectMock)
    });
    
    vi.spyOn(supabase, "from").mockImplementation(fromMock);

    const result = await sicoobOrderService.getOrderById("1");
    expect(result).toEqual(mockOrder);
    expect(supabase.from).toHaveBeenCalledWith("sicoob_orders");
  });
});

