import { describe, expect, it } from "vitest";
import { z } from "zod";
import { normalizeAssistantContext } from "../../supabase/functions/_shared/assistant-context.ts";

const AssistantContextSchema = z.preprocess(
  normalizeAssistantContext,
  z.string().max(500).optional(),
);

describe("assistantContext normalization", () => {
  it("preserves context below and exactly at the 500-character limit", () => {
    const shorterContext = "a".repeat(499);
    const limitContext = "b".repeat(500);

    expect(AssistantContextSchema.parse(shorterContext)).toBe(shorterContext);
    expect(AssistantContextSchema.parse(limitContext)).toBe(limitContext);
  });

  it("truncates only assistantContext before the length validation", () => {
    const oversizedContext = "c".repeat(700);

    expect(AssistantContextSchema.parse(oversizedContext)).toBe("c".repeat(500));
  });

  it("sanitizes control characters before measuring the limit", () => {
    const contextWithControl = `produto\u0000${"d".repeat(499)}`;

    expect(AssistantContextSchema.parse(contextWithControl)).toBe(`produto ${"d".repeat(492)}`);
  });

  it("keeps rejecting non-string values and preserves an omitted context", () => {
    expect(AssistantContextSchema.safeParse(123).success).toBe(false);
    expect(AssistantContextSchema.parse(undefined)).toBeUndefined();
  });
});
