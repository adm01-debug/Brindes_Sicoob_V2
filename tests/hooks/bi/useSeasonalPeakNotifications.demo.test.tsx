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

  it("monta sem marca, grava a notificacao e a marca, e remontar no mesmo dia deduplica", async () => {
    // Data fixa sem quebrar o polling do waitFor: `shouldAdvanceTime` avança
    // os timers fake automaticamente, entao a chave de dedup (data UTC) e
    // estavel entre as duas montagens.
    vi.useFakeTimers({ now: new Date("2026-11-21T12:00:00.000Z"), shouldAdvanceTime: true });
    try {
      const hook = () =>
        useSeasonalPeakNotifications({
          clientId: "c1",
          clientName: "Cli",
          daysToNextPeak: 2,
          nextPeakMonth: 4,
          isMock: false,
        });

      // 1a montagem: grava a notificacao E a marca de dedup no localStorage.
      const first = renderHook(hook);
      await waitFor(() => expect(mocks.from).toHaveBeenCalledWith("workspace_notifications"));
      await waitFor(() => expect(mocks.from.mock.calls.length).toBe(1));
      expect(mocks.from.mock.results[0].value.insert).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(localStorage.getItem("bi.peak-notif.user-1.c1.4.2026-11-21")).toBe("1")
      );

      // Reabertura real: desmonta a pagina antes de remontar no mesmo dia. A
      // marca precisa sobreviver ao fechamento (dedup sincrono no guard).
      first.unmount();
      renderHook(hook);
      await waitFor(() => expect(mocks.from.mock.calls.length).toBe(1));
      expect(mocks.from.mock.results[0].value.insert).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
