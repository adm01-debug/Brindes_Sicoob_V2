import { describe, expect, it } from "vitest";
import { validateWebhookDispatchModes } from "../../supabase/functions/_shared/webhook-dispatcher-contract.ts";

describe("validateWebhookDispatchModes", () => {
  it.each([
    ["despacho normal", {}],
    ["retry direcionado", { target_webhook_id: "hook-1", retry_after_attempt: 1 }],
    ["teste", { test_mode: true }],
    ["replay", { replay_delivery_id: "delivery-1" }],
  ])("aceita %s", (_mode, input) => {
    expect(validateWebhookDispatchModes(input)).toBeNull();
  });

  it.each([
    ["alvo sem contador", { target_webhook_id: "hook-1" }],
    ["contador sem alvo", { retry_after_attempt: 1 }],
  ])("rejeita %s", (_mode, input) => {
    expect(validateWebhookDispatchModes(input)).toBe(
      "target_webhook_id e retry_after_attempt devem ser informados juntos",
    );
  });

  it.each([
    ["retry com teste", { target_webhook_id: "hook-1", retry_after_attempt: 1, test_mode: true }],
    ["retry com replay", { target_webhook_id: "hook-1", retry_after_attempt: 1, replay_delivery_id: "delivery-1" }],
    ["teste com replay", { test_mode: true, replay_delivery_id: "delivery-1" }],
  ])("rejeita modos simultâneos: %s", (_mode, input) => {
    expect(validateWebhookDispatchModes(input)).toBe("Retry, teste e replay são modos exclusivos");
  });
});
