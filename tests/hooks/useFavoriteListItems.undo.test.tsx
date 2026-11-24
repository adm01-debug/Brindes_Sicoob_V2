import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

const state = vi.hoisted(() => ({
  calls: [] as Call[],
  trashed: null as Record<string, unknown> | null,
  toasts: [] as Array<{ title: string; action?: { onClick: () => Promise<void> | void } }>,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1" } }) }));

vi.mock("sonner", () => ({
  toast: {
    success: (title: string, options?: { action?: { onClick: () => Promise<void> | void } }) => {
      state.toasts.push({ title, action: options?.action });
    },
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function createChain(name: string) {
  const chain: Record<string, unknown> = {};
  const record = (method: string) => (...args: unknown[]) => {
    state.calls.push({ table: name, method, args });
    return chain;
  };
  [
    "select", "eq", "order", "limit", "in", "gte", "lte", "is", "not", "or",
    "update", "insert", "upsert", "delete", "range", "filter",
  ].forEach((method) => { chain[method] = record(method); });
  chain.maybeSingle = async () => ({ data: name === "favorite_items_trash" ? state.trashed : null, error: null });
  chain.single = async () => ({ data: { id: "item-1", list_id: "list-1" }, error: null });
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null, count: 0 });
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (name: string) => createChain(name),
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  },
}));

import { useFavoriteListItems } from "@/hooks/useFavoriteLists";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function trashFilters(fromIndex = 0) {
  const calls = state.calls.slice(fromIndex);
  const end = calls.findIndex((call) => call.method === "insert" || call.method === "delete");
  return calls
    .slice(0, end === -1 ? calls.length : end)
    .filter((call) => call.table === "favorite_items_trash" && call.method === "eq")
    .map((call) => call.args);
}

describe("useFavoriteListItems — desfazer remoção", () => {
  beforeEach(() => {
    state.calls.length = 0;
    state.toasts.length = 0;
    state.trashed = {
      id: "trash-1",
      list_id: "list-1",
      product_id: "prod-1",
      variant_id: "var-1",
      variant_info: null,
      note: null,
      price_at_save: null,
    };
  });

  it("restaura o produto e variante removidos, não o item mais recente da lixeira", async () => {
    const { result } = renderHook(() => useFavoriteListItems("list-1"), { wrapper: createWrapper() });

    await result.current.removeItem.mutateAsync({
      id: "item-1",
      productName: "Caneca",
      productId: "prod-1",
      variantId: "var-1",
    });

    expect(state.toasts.at(-1)?.title).toBe("Caneca removido dos favoritos");

    const beforeUndo = state.calls.length;
    await state.toasts.at(-1)?.action?.onClick();

    expect(trashFilters(beforeUndo)).toEqual([
      ["user_id", "user-1"],
      ["product_id", "prod-1"],
      ["variant_id", "var-1"],
    ]);
    expect(
      state.calls.some((call) => call.table === "favorite_items_trash" && call.method === "order"
        && JSON.stringify(call.args) === JSON.stringify(["deleted_at", { ascending: false }])),
    ).toBe(true);

    const restore = state.calls.find((call) => call.table === "favorite_items" && call.method === "insert");
    expect(restore?.args[0]).toMatchObject({ list_id: "list-1", product_id: "prod-1", variant_id: "var-1" });
    const deleteIndex = state.calls.findIndex(
      (call) => call.table === "favorite_items_trash" && call.method === "delete",
    );
    expect(deleteIndex).toBeGreaterThan(-1);
    expect(state.calls[deleteIndex + 1]).toMatchObject({ method: "eq", args: ["id", "trash-1"] });
  });

  it("sem produto informado, mantém o comportamento antigo (item mais recente)", async () => {
    const { result } = renderHook(() => useFavoriteListItems("list-1"), { wrapper: createWrapper() });

    await result.current.removeItem.mutateAsync({ id: "item-2", productName: "Item" });

    const beforeUndo = state.calls.length;
    await state.toasts.at(-1)?.action?.onClick();

    expect(trashFilters(beforeUndo)).toEqual([["user_id", "user-1"]]);
  });
});
