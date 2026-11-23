/**
 * resolve.ts — resolve destinatário, dados e link do e-mail transacional no servidor.
 *
 * O cliente envia apenas `event_type` + a referência (`quote_id`, `order_id` ou
 * `approval_request_id`). Tudo o que vai para o destinatário (e-mail, nome,
 * total, número e URL) é lido do banco sob a RLS do chamador, e o acesso é
 * confirmado pelo dono do registro. Sem isso, qualquer conta autenticada
 * conseguia disparar e-mail para um endereço arbitrário e anunciar um estado
 * que não existe.
 */

export interface EmailIntent {
  recipientEmail: string;
  recipientName?: string;
  actionUrl?: string;
  data: Record<string, unknown>;
}

export interface ResolveFailure {
  status: number;
  error: string;
}

export type ResolveResult =
  | { ok: true; intent: EmailIntent }
  | { ok: false; failure: ResolveFailure };

export type Row = Record<string, unknown> | null;

export interface ResolveAdapter {
  /** Leitura com a RLS do chamador. */
  find(table: string, columns: string, filters: Record<string, string>): Promise<Row>;
  /** Reaproveita o token ativo do orçamento ou cria um novo (service_role). */
  ensureApprovalToken(quoteId: string, sellerId: string): Promise<string | null>;
  /** E-mail/nome do aprovador (service_role: profiles não é legível por todos). */
  findApprovalRecipient(userId: string): Promise<{ email: string; full_name: string | null } | null>;
}

export interface ResolveOptions {
  eventType: string;
  body: Record<string, unknown>;
  user: { id: string; email?: string };
  /** Verdadeiro para supervisor/dev: enxerga e notifica registros de terceiros. */
  canViewAll: boolean;
  publicAppUrl?: string;
  deps: ResolveAdapter;
}

const QUOTE_EVENTS = new Set(["quote_sent", "quote_approved", "quote_rejected"]);
const ORDER_EVENTS = new Set(["order_created", "sicoob_order_status_change"]);
const EMAIL_RE = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

const APPROVABLE_QUOTE_STATUS = new Set(["approved", "approved_singular"]);
const REJECTABLE_QUOTE_STATUS = new Set(["rejected", "rejected_singular"]);
const UNSENDABLE_QUOTE_STATUS = new Set(["rejected", "rejected_singular", "expired"]);

const ORDER_STATUS_SENTENCE: Record<string, string> = {
  draft: "foi criado como rascunho.",
  pending: "foi criado e está aguardando aprovação.",
  waiting_approval: "foi criado e está aguardando aprovação.",
  escalated_to_board: "foi criado e está em análise pela Diretoria.",
  confirmed: "foi confirmado.",
  in_production: "foi confirmado e já está em produção.",
  in_separation: "está em separação.",
  in_transit: "está em trânsito.",
  delivered: "foi entregue.",
  completed: "foi concluído.",
  cancelled: "foi cancelado.",
  rejected: "foi rejeitado.",
};

export const orderStatusSentence = (status: unknown): string =>
  ORDER_STATUS_SENTENCE[String(status ?? "")] ?? "foi criado com sucesso.";

const fail = (status: number, error: string): ResolveResult => ({ ok: false, failure: { status, error } });

/** Aceita só origem https sem credenciais: link público nunca aponta para host interno. */
export function sanitizePublicUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function stringId(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[0-9a-fA-F-]{36}$/.test(trimmed) ? trimmed : null;
}

function optionalText(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim().slice(0, 2000) : undefined;
}

function validEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

function owns(record: Row, column: string, userId: string, canViewAll: boolean): boolean {
  return canViewAll || record?.[column] === userId;
}

async function resolveQuote(options: ResolveOptions, quoteId: string): Promise<ResolveResult> {
  const { eventType, user, canViewAll, deps } = options;
  const quote = await deps.find(
    "quotes",
    "client_email, client_name, quote_number, total, status, seller_id",
    { id: quoteId },
  );
  if (!quote) return fail(404, "referencia_nao_encontrada");
  if (!owns(quote, "seller_id", user.id, canViewAll)) return fail(403, "sem_permissao");

  const status = String(quote.status ?? "");
  const recipientEmail = validEmail(quote.client_email);
  if (!recipientEmail) return fail(422, "destinatario_ausente");

  if (eventType === "quote_approved" && !APPROVABLE_QUOTE_STATUS.has(status))
    return fail(409, "orcamento_nao_aprovado");
  if (eventType === "quote_rejected" && !REJECTABLE_QUOTE_STATUS.has(status))
    return fail(409, "orcamento_nao_recusado");
  if (eventType === "quote_sent" && UNSENDABLE_QUOTE_STATUS.has(status))
    return fail(409, "orcamento_indisponivel");

  const token = await deps.ensureApprovalToken(quoteId, String(quote.seller_id ?? user.id));
  if (!token) return fail(503, "link_publico_indisponivel");
  const base = sanitizePublicUrl(options.publicAppUrl);
  if (!base) return fail(503, "app_url_not_configured");

  return {
    ok: true,
    intent: {
      recipientEmail,
      recipientName: typeof quote.client_name === "string" ? quote.client_name : undefined,
      actionUrl: `${base}/proposta/${token}`,
      data: {
        quote_number: quote.quote_number,
        total: quote.total,
        status,
        reason: optionalText(options.body, "reason"),
      },
    },
  };
}

async function resolveSicoobOrder(options: ResolveOptions, orderId: string): Promise<ResolveResult> {
  const order = await options.deps.find(
    "sicoob_orders",
    "order_number, status, total_amount, created_by, source_quote_snapshot",
    { id: orderId },
  );
  if (!order) return fail(404, "referencia_nao_encontrada");
  if (!owns(order, "created_by", options.user.id, options.canViewAll)) return fail(403, "sem_permissao");

  const snapshot = (order.source_quote_snapshot ?? {}) as Record<string, unknown>;
  const recipientEmail = validEmail(snapshot.client_email);
  if (!recipientEmail) return fail(422, "destinatario_ausente");

  const base = sanitizePublicUrl(options.publicAppUrl);
  const status = String(order.status ?? "");
  return {
    ok: true,
    intent: {
      recipientEmail,
      recipientName: typeof snapshot.client_name === "string" ? snapshot.client_name : undefined,
      actionUrl: base ? `${base}/sicoob/pedidos/${orderId}` : undefined,
      data: {
        order_number: order.order_number,
        total: order.total_amount,
        status,
        status_sentence: orderStatusSentence(status),
        notes: optionalText(options.body, "notes"),
      },
    },
  };
}

async function resolveLegacyOrder(options: ResolveOptions, orderId: string): Promise<ResolveResult> {
  const order = await options.deps.find(
    "orders",
    "order_number, status, total, client_email, client_name, seller_id",
    { id: orderId },
  );
  if (!order) return fail(404, "referencia_nao_encontrada");
  if (!owns(order, "seller_id", options.user.id, options.canViewAll)) return fail(403, "sem_permissao");

  const recipientEmail = validEmail(order.client_email);
  if (!recipientEmail) return fail(422, "destinatario_ausente");

  const status = String(order.status ?? "");
  return {
    ok: true,
    intent: {
      recipientEmail,
      recipientName: typeof order.client_name === "string" ? order.client_name : undefined,
      // Pedido legado não tem página de detalhe pública: ensinar um link quebrado
      // é pior do que enviar o e-mail sem botão.
      data: {
        order_number: order.order_number,
        total: order.total,
        status,
        status_sentence: orderStatusSentence(status),
        notes: optionalText(options.body, "notes"),
      },
    },
  };
}

async function resolveOrder(options: ResolveOptions, orderId: string): Promise<ResolveResult> {
  const sicoob = await resolveSicoobOrder(options, orderId);
  return sicoob.ok ? sicoob : resolveLegacyOrder(options, orderId);
}

async function resolveApprovalRequest(options: ResolveOptions, requestId: string): Promise<ResolveResult> {
  const request = await options.deps.find(
    "sicoob_approval_requests",
    "order_id, requester_id, approver_id, status, amount_at_request",
    { id: requestId },
  );
  if (!request) return fail(404, "referencia_nao_encontrada");
  const isParty = request.requester_id === options.user.id || request.approver_id === options.user.id;
  if (!isParty && !options.canViewAll) return fail(403, "sem_permissao");
  if (request.status !== "pending") return fail(409, "solicitacao_nao_pendente");

  const approverId = typeof request.approver_id === "string" ? request.approver_id : null;
  if (!approverId) return fail(422, "destinatario_ausente");
  const recipient = await options.deps.findApprovalRecipient(approverId);
  const recipientEmail = validEmail(recipient?.email);
  if (!recipientEmail) return fail(422, "destinatario_ausente");

  const base = sanitizePublicUrl(options.publicAppUrl);
  const orderId = String(request.order_id ?? "");
  return {
    ok: true,
    intent: {
      recipientEmail,
      recipientName: recipient?.full_name ?? undefined,
      actionUrl: base ? `${base}/sicoob/pedidos/${orderId}` : undefined,
      data: { amount_at_request: request.amount_at_request },
    },
  };
}

export async function resolveEmailIntent(options: ResolveOptions): Promise<ResolveResult> {
  const { eventType, body } = options;
  if (QUOTE_EVENTS.has(eventType)) {
    const quoteId = stringId(body, "quote_id");
    if (!quoteId) return fail(422, "referencia_obrigatoria");
    return resolveQuote(options, quoteId);
  }
  if (ORDER_EVENTS.has(eventType)) {
    const orderId = stringId(body, "order_id");
    if (!orderId) return fail(422, "referencia_obrigatoria");
    return resolveOrder(options, orderId);
  }
  if (eventType === "sicoob_order_approval_request") {
    const requestId = stringId(body, "approval_request_id");
    if (!requestId) return fail(422, "referencia_obrigatoria");
    return resolveApprovalRequest(options, requestId);
  }
  return fail(422, "payload_invalido");
}
