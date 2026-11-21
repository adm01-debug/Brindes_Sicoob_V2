/**
 * Regressao: alerta de pico sazonal nao pode gravar notificacao para equipe
 * real quando a sazonalidade vem do cliente de demonstracao (isMock).
 *
 * O guard `if (isMock) return;` foi adicionado no ADM-35; sem ele o BI em modo
 * demo gravava aviso de pico na tabela real de toda equipe.
 */
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

import { useSeasonalPeakNotifications } from "@/hooks/bi/useSeasonalPeakNotifications";

function chainFor(result: { data: unknown; error: null }) {
  return {
    insert: vi.fn((_payload: unknown) => Promise.resolve(result)),
  };
}

describe("useSeasonalPeakNotifications - demo vs pico real", () => {
  beforeEach(() => {
    mocks.useAuth.mockReset().mockReturnValue({ user: { id: "user-1" } });
    mocks.from.mockReset().mockReturnValue(chainFor({ data: null, error: null }));
    localStorage.clear();
  });

  it("modo demo (isMock) nunca grava notificacao", async () => {
    renderHook(() =>
      useSeasonalPeakNotifications({
        clientId: "c1",
        clientName: "Cli",
        daysToNextPeak: 3,
        nextPeakMonth: 4,
        isMock: true,
      })
    );
    await waitFor(() => expect(mocks.from).not.toHaveBeenCalled());
    expect(mocks.from.mock.calls.length).toBe(0);
  });

  it("pico real elegivel grava workspace_notification com payload correto", async () => {
    renderHook(() =>
      useSeasonalPeakNotifications({
        clientId: "c1",
        clientName: "Cli",
        daysToNextPeak: 0,
        nextPeakMonth: 4,
        isMock: false,
      })
    );
    await waitFor(() => expect(mocks.from).toHaveBeenCalledWith("workspace_notifications"));
    const chain = mocks.from.mock.results[0].value;
    expect(chain.insert).toHaveBeenCalledTimes(1);
    const payload = chain.insert.mock.calls[0][0];
    expect(payload.user_id).toBe("user-1");
    expect(payload.category).toBe("bi_seasonal_peak");
    expect(payload.title).toContain("pico sazonal hoje");
  });

  it("segunda montagem no mesmo dia respeita dedup (sem nova gravacao)", async () => {
    // Fixa a data UTC: a chave de dedup inclui `new Date().toISOString().slice(0,10)`
    // e o teste nao pode depender do relogio real (virada de dia quebra a premissa).
    const FIXED = new Date("2026-11-21T12:00:00.000Z");
    vi.setSystemTime(FIXED);
    try {
      mocks.from.mockReturnValueOnce(chainFor({ data: null, error: null }));
      const hook = () =>
        useSeasonalPeakNotifications({
          clientId: "c1",
          clientName: "Cli",
          daysToNextPeak: 2,
          nextPeakMonth: 4,
          isMock: false,
        });

      // 1a montagem grava e salva o marker no localStorage
      renderHook(hook);
      await waitFor(() => expect(mocks.from).toHaveBeenCalled());
      await waitFor(() => expect(localStorage.getItem("bi.peak-notif.user-1.c1.4.2026-11-21")).toBe("1"));

      // 2a montagem no mesmo dia -> dedup, sem nova gravacao
      renderHook(hook);
      await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(1));
    } finally {
      vi.setSystemTime(new Date());
    }
  });
});
