type ReportEmailInput = {
  apiKey: string | undefined;
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  fetcher?: typeof fetch;
};

type RecordSent = (providerEmailId: string) => Promise<void>;

/**
 * A chave de idempotencia precisa identificar o payload, nao apenas o ciclo.
 * Resend responde HTTP 409 quando a mesma chave reaparece com corpo diferente;
 * se o destinatario ou o conteudo mudarem entre tentativas, o agendamento
 * ficaria travado ate a chave expirar no provedor. Incluindo um digest do
 * payload, uma alteracao gera automaticamente uma nova versao de intencao e um
 * retry identico continua sendo deduplicado.
 */
export async function buildScheduledReportIdempotencyKey(
  scope: string,
  payload: { to: string; subject: string; html: string },
): Promise<string> {
  const canonical = JSON.stringify([payload.to, payload.subject, payload.html]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${scope.slice(0, 200)}:${hex.slice(0, 32)}`;
}

/** Só confirma o ciclo do agendamento depois que Resend aceita o e-mail e o banco é atualizado. */
export async function sendScheduledReportEmail(
  input: ReportEmailInput,
  recordSent: RecordSent,
): Promise<string> {
  const apiKey = input.apiKey?.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada.");
  if (!idempotencyKey || idempotencyKey.length > 256) {
    throw new Error("Chave de idempotência do relatório inválida.");
  }

  const response = await (input.fetcher ?? fetch)("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: "Promo Gifts <noreply@promogifts.com.br>",
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend recusou o relatório (HTTP ${response.status}).`);
  }

  const receipt: unknown = await response.json();
  if (!receipt || typeof receipt !== "object" || !("id" in receipt)
    || typeof receipt.id !== "string" || receipt.id.trim() === "") {
    throw new Error("Resend não retornou o identificador do e-mail.");
  }

  await recordSent(receipt.id);
  return receipt.id;
}
