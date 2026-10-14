import { describe, expect, it } from "vitest";
import { canBulkMarkQuotesPending, isQuoteCommerciallyEditable, quoteStatusRequiresDraftReset } from "@/lib/quote-status-config";

describe("isQuoteCommerciallyEditable", () => {
  it.each(["draft", "revision", "rejected", "rejected_singular"])(
    "permite alteração no estado %s",
    (status) => expect(isQuoteCommerciallyEditable(status)).toBe(true),
  );

  it.each(["draft", "revision", "rejected", "rejected_singular"])(
    "preserva a versão histórica no estado %s",
    (status) => expect(isQuoteCommerciallyEditable(status, false)).toBe(false),
  );

  it.each([
    "pending", "sent", "viewed", "pending_approval",
    "pending_singular_approval", "approved", "approved_singular",
    "converted", "expired", null, undefined,
  ])("preserva o histórico no estado %s", (status) => {
    expect(isQuoteCommerciallyEditable(status)).toBe(false);
  });
});

describe("canBulkMarkQuotesPending", () => {
  it("aceita somente uma seleção não vazia de rascunhos vigentes", () => {
    expect(canBulkMarkQuotesPending([{ status: "draft" }, { status: "draft", is_latest_version: true }])).toBe(true);
  });

  it.each([
    { quotes: [] },
    { quotes: [{ status: "pending" }] },
    { quotes: [{ status: "draft", is_latest_version: false }] },
    { quotes: [{ status: "draft" }, { status: "expired" }] },
  ])("bloqueia seleção incompatível %#", ({ quotes }) => {
    expect(canBulkMarkQuotesPending(quotes)).toBe(false);
  });
});

describe("quoteStatusRequiresDraftReset", () => {
  it.each(["revision", "rejected", "rejected_singular"])(
    "reabre %s como rascunho antes de reenviar",
    (status) => expect(quoteStatusRequiresDraftReset(status)).toBe(true),
  );

  it.each(["draft", "pending", "sent", null, undefined])(
    "não cria reabertura artificial para %s",
    (status) => expect(quoteStatusRequiresDraftReset(status)).toBe(false),
  );
});
