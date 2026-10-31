export interface WebhookDispatchModes {
  target_webhook_id?: string;
  retry_after_attempt?: number;
  replay_delivery_id?: string;
  test_mode?: boolean;
}

/** Valida combinações antes da autorização e do despacho de efeitos externos. */
export function validateWebhookDispatchModes(input: WebhookDispatchModes): string | null {
  const hasRetryTarget = input.target_webhook_id !== undefined;
  const hasRetryAttempt = input.retry_after_attempt !== undefined;
  if (hasRetryTarget !== hasRetryAttempt) {
    return "target_webhook_id e retry_after_attempt devem ser informados juntos";
  }
  if (
    (hasRetryTarget && (input.test_mode || input.replay_delivery_id)) ||
    (input.test_mode && input.replay_delivery_id)
  ) {
    return "Retry, teste e replay são modos exclusivos";
  }
  return null;
}
