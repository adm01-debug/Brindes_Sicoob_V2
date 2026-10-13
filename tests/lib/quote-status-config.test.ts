import { describe, expect, it } from "vitest";
import { isQuoteCommerciallyEditable } from "@/lib/quote-status-config";

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
