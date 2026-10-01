import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  channels: [] as Array<{
    name: string;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }>,
  queryClient: { invalidateQueries: vi.fn() },
  removeChannel: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn((name: string) => {
      const channel = {
        name,
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mocks.channels.push(channel);
      return channel;
    }),
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn() },
}));

import { useRealtimeSync } from "@/hooks/useRealtimeSync";

describe("useRealtimeSync", () => {
  beforeEach(() => {
    mocks.channels.length = 0;
    mocks.queryClient.invalidateQueries.mockReset();
    mocks.removeChannel.mockReset();
  });

  it("mantém uma única assinatura quando callbacks inline mudam", () => {
    const primeiroCallback = vi.fn();
    const segundoCallback = vi.fn();
    const { rerender } = renderHook(
      ({ callback }) => useRealtimeSync("quotes", { onDataChange: callback }),
      { initialProps: { callback: primeiroCallback } },
    );

    rerender({ callback: segundoCallback });

    expect(mocks.channels).toHaveLength(1);
    const handler = mocks.channels[0]?.on.mock.calls[0]?.[2];
    act(() => handler?.({ eventType: "UPDATE" }));
    expect(primeiroCallback).not.toHaveBeenCalled();
    expect(segundoCallback).toHaveBeenCalledOnce();
  });

  it("cria nomes distintos para consumidores simultâneos da mesma tabela", () => {
    const primeiraAssinatura = renderHook(() => useRealtimeSync("quotes"));
    const segundaAssinatura = renderHook(() => useRealtimeSync("quotes"));

    expect(mocks.channels).toHaveLength(2);
    expect(mocks.channels[0]?.name).not.toBe(mocks.channels[1]?.name);

    primeiraAssinatura.unmount();
    segundaAssinatura.unmount();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(2);
  });
});
