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
 * A chave identifica o ciclo do agendamento, nunca o conteudo gerado. O HTML e
 * recalculado a cada tentativa e muda sozinho quando um pedido entra no
 * periodo; derivar a chave dele faria o mesmo ciclo enviar um segundo e-mail
 * apos uma falha de persistencia. Com a chave presa ao ciclo, o Resend deduplica
 * o retry e um eventual HTTP 409 e tratado como entrega ja aceita.
 */
export function buildScheduledReportIdempotencyKey(scope: string): string {
  return scope.trim().slice(0, 256);
}

/**
 * Marcador usado quando o Resend responde 409: o provedor ja aceitou um e-mail
 * para esta chave, entao o ciclo foi entregue e so falta confirma-lo no banco.
 */
export const DUPLICATE_RECEIPT = "duplicate";

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

  // 409 tem dois significados no Resend e eles nao se confundem:
  //   - chave reusada com outro corpo: o primeiro envio FOI aceito. O HTML e
  //     recalculado a cada tentativa do mesmo ciclo, entao esse e o 409 normal
  //     de um retry; o ciclo saiu e so falta confirma-lo no banco.
  //   - requisicao concorrente com a mesma chave: outra invocacao ainda esta em
  //     voo e pode falhar. Confirmar o ciclo aqui o marcaria como enviado sem
  //     e-mail nenhum. Nao confirma: a proxima rodada tenta de novo e a chave
  //     segue protegendo contra envio duplicado.
  // Qualquer outro 409 continua tratado como aceito — tratar desconhecido como
  // falha travaria o agendamento, que voltaria a bater 409 para sempre.
  if (response.status === 409) {
    const detalhe = await response.text().catch(() => "");
    if (/concurrent/i.test(detalhe)) {
      throw new Error(
        "Resend relatou requisição concorrente para a mesma chave de idempotência (HTTP 409).",
      );
    }
    await recordSent(DUPLICATE_RECEIPT);
    return DUPLICATE_RECEIPT;
  }

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
