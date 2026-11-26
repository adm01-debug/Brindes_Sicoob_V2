import { ShieldAlert } from "lucide-react";
import { useApprovalThreshold } from "@/hooks/admin/useApprovalThreshold";
import { formatCurrency } from "@/lib/utils";

export interface CartThresholdItem {
  product_price: number;
  quantity: number;
}

type NoticeState = "exact" | "carry-over" | "missing" | "future-only";

interface NoticeCopy {
  state: NoticeState;
  title: string;
  value: number | null;
  alerts: string[];
  over: boolean;
}

/**
 * O servidor exige alcada na competencia exata do pedido para confirmar dentro
 * da alcada e para registrar a solicitacao de aprovacao
 * (20260912140000:85-92 e 20261008010000:1265-1273). Sem a linha do mes o
 * caminho nao existe, entao o carrinho avisa em vez de prometer aprovacao.
 */
function missingCompetenceAlert(requestedCompetenceLabel: string | null): string {
  return `O mês do carrinho${requestedCompetenceLabel ? ` (${requestedCompetenceLabel})` : ""} não tem alçada de verba: o pedido não pode ser confirmado nem enviado para aprovação até o administrador configurar a alçada do mês.`;
}

function exactCopy(competenceLabel: string | null, paThreshold: number, over: boolean): NoticeCopy {
  return {
    state: "exact",
    title: `Alçada de ${competenceLabel ?? "verba"}`,
    value: paThreshold,
    over,
    alerts: over
      ? [paThreshold === 0
          ? "A alçada aprovada deste mês é R$ 0,00: todo pedido exige aprovação formal do Gestor da Singular."
          : "Este carrinho excede a alçada e exigirá aprovação do Gestor da Singular."]
      : [],
  };
}

function carriedOverCopy(input: {
  competenceLabel: string | null;
  requestedCompetenceLabel: string | null;
  paThreshold: number;
  over: boolean;
}): NoticeCopy {
  return {
    state: "carry-over",
    title: `Alçada herdada de ${input.competenceLabel ?? "verba"}`,
    value: input.paThreshold,
    over: input.over,
    alerts: [
      missingCompetenceAlert(input.requestedCompetenceLabel),
      ...(input.over ? ["Referência: o valor acima já supera o último limite aprovado."] : []),
    ],
  };
}

/**
 * Verba cadastrada apenas em competencia futura. O mes do carrinho continua sem
 * alcada, mas a tela nao pode se calar: sem este aviso o comprador so descobre o
 * bloqueio quando o servidor recusa o pedido.
 */
function requestedMonthLabel(requestedCompetenceLabel: string | null): string {
  return requestedCompetenceLabel ? ` de ${requestedCompetenceLabel}` : "";
}

function futureCompetenceAlert(
  futureLabel: string,
  requestedCompetenceLabel: string | null,
  hasRequestedMonthRow: boolean,
): string {
  // A linha do mês do carrinho pode existir com a alçada em branco (o formulário
  // de verbas salva sem alçada). Nesse caso dizer que "não há verba para o mês"
  // contradiz o painel do administrativo e esconde o que falta preencher.
  if (hasRequestedMonthRow) {
    return `Há verba cadastrada para ${futureLabel}; a verba${requestedMonthLabel(requestedCompetenceLabel)} está cadastrada, mas sem alçada definida: o administrativo precisa preencher a alçada antes de o pedido ser confirmado.`;
  }
  return `Há verba cadastrada para ${futureLabel}, mas não para o mês do carrinho${requestedCompetenceLabel ? ` (${requestedCompetenceLabel})` : ""}: o administrativo precisa configurar a alçada deste mês antes de o pedido ser confirmado.`;
}

function missingCopy(
  requestedCompetenceLabel: string | null,
  futureLabel: string | null,
  hasRequestedMonthRow: boolean,
): NoticeCopy {
  return {
    state: futureLabel ? "future-only" : "missing",
    title: `Sem alçada para ${requestedCompetenceLabel ?? "o mês do carrinho"}`,
    value: null,
    over: false,
    alerts: [
      missingCompetenceAlert(requestedCompetenceLabel),
      ...(futureLabel ? [futureCompetenceAlert(futureLabel, requestedCompetenceLabel, hasRequestedMonthRow)] : []),
    ],
  };
}

function buildNoticeCopy(input: {
  paThreshold: number | null;
  isCarryOver: boolean;
  competenceLabel: string | null;
  requestedCompetenceLabel: string | null;
  futurePaBudgetLabel: string | null;
  /** O mês do carrinho tem linha de verba própria (mesmo sem alçada preenchida). */
  hasRequestedMonthRow: boolean;
  over: boolean;
}): NoticeCopy {
  if (input.paThreshold === null)
    return missingCopy(input.requestedCompetenceLabel, input.futurePaBudgetLabel, input.hasRequestedMonthRow);
  if (input.isCarryOver) return carriedOverCopy({ ...input, paThreshold: input.paThreshold });
  return exactCopy(input.competenceLabel, input.paThreshold, input.over);
}

function NoticeAlerts({ copy }: { copy: NoticeCopy }) {
  if (copy.alerts.length === 0) return null;
  const tone = copy.over ? "text-destructive" : "text-warning";
  return (
    <>
      {copy.alerts.map((alert) => (
        <p key={alert} className={`text-[10px] font-semibold ${tone}`} role="alert">
          {alert}
        </p>
      ))}
    </>
  );
}

/**
 * Alcada que vale no carrinho do cabecalho. O aviso existe porque a linha de
 * verba visivel pode nao ser a do mes do carrinho: o comprador precisa saber se
 * a competencia corrente tem alcada aprovada antes de gerar o orcamento.
 */
export function CartApprovalThresholdNotice({ items }: { items: CartThresholdItem[] }) {
  const {
    paThreshold,
    hasVisiblePaBudget,
    competenceLabel,
    requestedCompetenceLabel,
    futurePaBudgetLabel,
    isCarryOver,
    needsApproval,
  } =
    useApprovalThreshold(items.map((item) => ({ unit_price: item.product_price, quantity: item.quantity, category_id: null })));

  if (!hasVisiblePaBudget) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
  const copy = buildNoticeCopy({
    paThreshold,
    isCarryOver,
    competenceLabel,
    requestedCompetenceLabel,
    futurePaBudgetLabel,
    hasRequestedMonthRow: competenceLabel !== null && !isCarryOver,
    over: needsApproval(subtotal),
  });

  return (
    <div
      data-testid="cart-approval-threshold"
      data-state={copy.state}
      className={copy.over ? "space-y-1 p-3 rounded-lg border bg-destructive/5 border-destructive/30" : "space-y-1 p-3 rounded-lg border bg-muted/30 border-border/50"}
      role="region"
      aria-label="Alçada de aprovação do carrinho"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
          {copy.title}
        </span>
        {copy.value !== null && <span className="text-[10px] font-bold tabular-nums">{formatCurrency(copy.value)}</span>}
      </div>
      <NoticeAlerts copy={copy} />
    </div>
  );
}
