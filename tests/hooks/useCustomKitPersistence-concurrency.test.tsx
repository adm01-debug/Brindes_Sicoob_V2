import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const filters: Array<[string, unknown]> = [];
let updateResult: { data: unknown; error: null } = { data: { id: "kit-1" }, error: null };
const maybeSingle = vi.fn(async () => updateResult);
const select = vi.fn(() => ({ maybeSingle }));
const update = vi.fn(() => ({
  eq: vi.fn((column: string, value: unknown) => {
    filters.push([column, value]);
    return { eq: vi.fn((nextColumn: string, nextValue: unknown) => {
      filters.push([nextColumn, nextValue]);
      return { eq: vi.fn((lastColumn: string, lastValue: unknown) => {
        filters.push([lastColumn, lastValue]);
        return { select };
      }) };
    }) };
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ update })) },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const kitState = {
  name: "Kit revisado", kitType: "montado", box: null, items: [],
  personalization: { box: { enabled: false }, items: {} }, identity: null,
  boxPrice: 0, itemsPrice: 0, personalizationPrice: 0, totalPrice: 0,
  volumeUsagePercent: 0, isValid: true,
} as never;

async function setup(updatedAt: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  queryClient.setQueryData(["custom-kits"], [{ id: "kit-1", updated_at: updatedAt }]);
  const { useCustomKitPersistence } = await import("@/hooks/useCustomKitPersistence");
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCustomKitPersistence(), { wrapper });
}

describe("persistência concorrente de kits", () => {
  it("condiciona o update ao updated_at lido para impedir sobrescrita por outra aba", async () => {
    filters.length = 0;
    updateResult = { data: { id: "kit-1" }, error: null };
    const { result } = await setup("2026-10-18T12:00:00.000Z");
    await act(async () => {
      await result.current.saveKit(kitState, 1, "kit-1");
    });
    expect(filters).toContainEqual(["updated_at", "2026-10-18T12:00:00.000Z"]);
  });

  it("expõe conflito quando outra aba já alterou a linha", async () => {
    filters.length = 0;
    updateResult = { data: null, error: null };
    const { result } = await setup("2026-10-18T12:00:00.000Z");
    await expect(result.current.saveKit(kitState, 1, "kit-1")).rejects.toMatchObject({ name: "CustomKitConflictError" });
  });
});
