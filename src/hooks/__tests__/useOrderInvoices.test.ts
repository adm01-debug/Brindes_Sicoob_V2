import { renderHook, act } from "@testing-library/react";
import { useOrderInvoices } from "../useOrderExtensions";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: "test.pdf" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "http://test.com/test.pdf" } }),
      })),
    },
  },
}));

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useOrderInvoices", () => {
  it("should validate file size on upload", async () => {
    const { result } = renderHook(() => useOrderInvoices("order-123"), { wrapper });
    
    const largeFile = new File([""], "large.pdf", { type: "application/pdf" });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    await expect(result.current.uploadFile(largeFile, "path")).rejects.toThrow("Arquivo muito grande");
  });

  it("should validate file type", async () => {
    const { result } = renderHook(() => useOrderInvoices("order-123"), { wrapper });
    
    const invalidFile = new File([""], "test.txt", { type: "text/plain" });
    await expect(result.current.uploadFile(invalidFile, "path")).rejects.toThrow("Tipo de arquivo não permitido");
  });

  it("should detect duplicate files", async () => {
    const mockList = vi.fn().mockResolvedValue({ data: [{ name: "duplicate.pdf" }], error: null });
    (supabase.storage.from as any).mockReturnValue({ list: mockList });

    const { result } = renderHook(() => useOrderInvoices("order-123"), { wrapper });
    const file = new File([""], "duplicate.pdf", { type: "application/pdf" });

    await expect(result.current.uploadFile(file, "duplicate.pdf")).rejects.toThrow("Arquivo já existe");
  });
});
