export interface TransactionalEmailMessage {
  eventType: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  html: string;
}

export interface TransactionalDeliveryResult {
  accepted: boolean;
  errorCode?: string;
  providerId?: string;
}

const EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

/**
 * Transporter durável via Resend. Degrada com email_not_configured quando
 * faltam RESEND_API_KEY / NOTIFICATION_FROM_EMAIL, sem lançar exceção.
 */
export async function deliverTransactionalEmail(
  message: TransactionalEmailMessage,
): Promise<TransactionalDeliveryResult> {
  if (!EMAIL.test(message.recipientEmail) || message.recipientEmail.length > 254) {
    return { accepted: false, errorCode: "invalid_recipient" };
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "";
  if (!apiKey || !EMAIL.test(from) || from.length > 254) {
    return { accepted: false, errorCode: "email_not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [message.recipientEmail],
        subject: message.subject,
        html: message.html,
      }),
    });

    if (!response.ok) {
      return { accepted: false, errorCode: `provider_http_${response.status}` };
    }
    const data = await response.json();
    if (typeof data?.id !== "string" || data.id.trim().length === 0 || data.id.length > 200) {
      return { accepted: false, errorCode: "invalid_provider_ack" };
    }
    return { accepted: true, providerId: data.id };
  } catch {
    return { accepted: false, errorCode: "provider_result_unknown" };
  }
}
