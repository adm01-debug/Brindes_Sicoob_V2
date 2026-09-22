export interface StepUpOtpDelivery {
  challengeId: string;
  recipientEmail: string;
  otp: string;
  expiresAt: string;
}

export interface StepUpOtpDeliveryResult {
  accepted: boolean;
  errorCode?: string;
  providerId?: string;
}

interface DeliveryOptions {
  apiKey?: string;
  from?: string;
  fetcher?: typeof fetch;
}

const EMAIL = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function deliverStepUpOtp(
  delivery: StepUpOtpDelivery,
  options: DeliveryOptions = {},
): Promise<StepUpOtpDeliveryResult> {
  if (!UUID.test(delivery.challengeId) || !EMAIL.test(delivery.recipientEmail)
    || delivery.recipientEmail.length > 254 || !/^\d{6}$/.test(delivery.otp)
    || !Number.isFinite(Date.parse(delivery.expiresAt))) {
    return { accepted: false, errorCode: "invalid_otp_delivery" };
  }

  const apiKey = options.apiKey ?? Deno.env.get("RESEND_API_KEY");
  const from = options.from ?? Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "";
  if (!apiKey || !EMAIL.test(from) || from.length > 254) {
    return { accepted: false, errorCode: "email_not_configured" };
  }

  try {
    const response = await (options.fetcher ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": `step-up/${delivery.challengeId}`,
      },
      body: JSON.stringify({
        from,
        to: [delivery.recipientEmail],
        subject: "Código de verificação — Portal de Brindes Sicoob",
        text: `Seu código de verificação é ${delivery.otp}. Ele expira em 5 minutos. Se você não solicitou esta ação, ignore esta mensagem.`,
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
