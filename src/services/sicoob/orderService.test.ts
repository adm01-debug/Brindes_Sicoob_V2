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

  it("registers audit event and notifications on status update", async () => {
    (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: "user_123", email: "test@sicoob.com.br" } }, error: null });
    
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const selectMock = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { created_by: "owner_456" }, error: null })
    };

    vi.spyOn(supabase, "from").mockImplementation((table) => {
      if (table === "sicoob_orders") return { update: updateMock, select: vi.fn().mockReturnValue(selectMock) } as any;
      if (table === "order_audit_events") return { insert: insertMock } as any;
      if (table === "notifications") return { insert: insertMock } as any;
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() } as any;
    });

    await sicoobOrderService.updateOrderStatus("order_1", "confirmed", "pending", "Aprovação via teste");

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed" }));
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ 
      order_id: "order_1",
      event_type: "status_change",
      observations: "Aprovação via teste"
    }));
  });
});

