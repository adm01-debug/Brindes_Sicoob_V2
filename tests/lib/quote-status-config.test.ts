import { describe, expect, it } from "vitest";
import { canBulkMarkQuotesPending, isQuoteCommerciallyEditable, QUOTE_STATUS_CONFIG, QUOTE_STATUS_FILTER_ORDER, quoteStatusRequiresDraftReset } from "@/lib/quote-status-config";

const ALL_QUOTE_STATUSES = [
  "draft", "pending", "sent", "approved", "rejected", "expired", "revision", "viewed", "converted",
  "pending_approval", "pending_singular_approval", "approved_singular", "rejected_singular",
];

describe("fonte única dos status", () => {
  it("cobre cada status exatamente uma vez na configuração e nos filtros", () => {
    expect(new Set(Object.keys(QUOTE_STATUS_CONFIG))).toEqual(new Set(ALL_QUOTE_STATUSES));
    expect(new Set(QUOTE_STATUS_FILTER_ORDER)).toEqual(new Set(["all", ...ALL_QUOTE_STATUSES]));
    expect(QUOTE_STATUS_FILTER_ORDER).toHaveLength(new Set(QUOTE_STATUS_FILTER_ORDER).size);
  });
});

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
