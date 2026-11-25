import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "token-de-teste" } } }),
    },
  },
  getSupabaseFunctionUrl: () => "https://exemplo.test/functions/v1/expert-chat",
  supabasePublishableKey: "chave-publicavel",
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { AIMockupAssistant } from "@/components/ai/AIMockupAssistant";

describe("foco do assistente de layouts", () => {
  it("leva o foco para o chat ao abrir e devolve ao botao ao fechar", async () => {
    // jsdom nao implementa scrollTo; o AIChat usa para auto-scroll.
    Element.prototype.scrollTo = vi.fn();

    render(<AIMockupAssistant productName="Caneca Sicoob" techniqueName="Laser" />);

    const launcher = screen.getByRole("button", { name: /assistente de layouts/i });
    fireEvent.click(launcher);

    const textarea = screen.getByLabelText(/mensagem para o assistente/i);
    await waitFor(() => expect(document.activeElement).toBe(textarea));

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /assistente de layouts/i })),
    );
  });
});
