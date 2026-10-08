import type { ReactNode } from "react";
/**
 * PriceFreshnessBadge
 *
 * Visual indicator showing when the supplier last updated this product's price.
 * Three variants:
 *  - `inline`: full text + icon (PDP, Quick View)
 *  - `compact`: shortened "há Nd" (sticky header, quote builder line)
 *  - `icon-only`: icon w/ aria-label (catalog cards, table)
 *
 * In `compact` and `icon-only` variants, the badge only renders for
 * `aging`/`stale` statuses to avoid noise on freshly-updated products.
 */
import { AlertTriangle, Clock, CheckCircle2, HelpCircle, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getPriceFreshness,
  formatPriceDateLong,
  formatPriceDateShort,
  type PriceFreshnessStatus,
  type PriceFreshness,
} from "@/utils/price-freshness";

const STATUS_LABELS: Record<PriceFreshnessStatus, string> = {
  fresh: "Atualizado",
  aging: "Próximo do limite",
  stale: "Possivelmente defasado",
  unknown: "Sem informação",
};

function optionalDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function accessibleRelative(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

function accessibleStatusCopy(freshness: PriceFreshness, longDate: string | null, relative: string | null): string {
  if (freshness.status === "fresh") {
    return longDate ? `Preço atualizado pelo fornecedor em ${longDate}, ${relative}.` : "Preço atualizado pelo fornecedor recentemente.";
  }
  if (freshness.status === "aging") {
    return longDate
      ? `Preço próximo do limite de validade. Última atualização do fornecedor em ${longDate}, ${relative}. Recomendamos confirmar antes de fechar o orçamento.`
      : "Preço próximo do limite de validade. Recomendamos confirmar com o fornecedor.";
  }
  if (freshness.status === "stale") {
    return longDate
      ? `Atenção: preço possivelmente defasado. Última atualização do fornecedor em ${longDate}, ${relative}. Confirme o valor antes de enviar o orçamento ao cliente.`
      : "Atenção: preço possivelmente defasado. Confirme com o fornecedor antes de enviar o orçamento.";
  }
  return /inválida/i.test(freshness.label)
    ? "Preço com data de atualização inválida informada pelo fornecedor. Confirme o valor antes de enviar o orçamento."
    : "Preço com data de atualização não informada pelo fornecedor. Confirme o valor antes de enviar o orçamento.";
}

/**
 * Aria-label rico para leitores de tela. O label do util é otimizado para
 * UI ("Atualizado há 5 dias"), mas em `icon-only`/`compact` o leitor de
 * tela não tem o contexto visual do "$ 19,90" ao lado — precisa ouvir
 * **Preço** + status legível + data por extenso quando disponível. Para
 * contexto mais rico do que aria-label sozinho consegue, complementamos
 * com `title` (lido por SRs como descrição auxiliar e útil offline).
 */
function buildAccessibleLabel(
  freshness: PriceFreshness,
  priceUpdatedAt?: string | Date | null,
): { ariaLabel: string; title: string } {
  const dateValue = optionalDate(priceUpdatedAt);
  const longDate = dateValue ? formatPriceDateLong(dateValue) : null;
  const relative = accessibleRelative(freshness.daysSinceUpdate);
  const ariaLabel = accessibleStatusCopy(freshness, longDate, relative);

  // `title` espelha o aria-label para que o tooltip nativo do navegador
  // funcione mesmo quando o Radix Tooltip não estiver disponível (ex.: foco
  // por teclado em browsers sem suporte a hover).
  return { ariaLabel, title: ariaLabel };
}

/** Data + hora exatas no fuso local do usuário (PT-BR). Ex.: "24/04/2026 09:32". */
function formatExactDateTime(value: string | Date): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function buildClassificationRule(thresholdDays: number): string {
  const half = Math.floor(thresholdDays / 2);
  return `Regra: até ${half} dias = atualizado · ${half + 1}–${thresholdDays} dias = próximo do limite · acima de ${thresholdDays} dias = possivelmente defasado.`;
}

interface FreshnessTooltipProps {
  freshness: PriceFreshness;
  priceUpdatedAt?: string | Date | null;
}

function TooltipStatusLine({ freshness }: Pick<FreshnessTooltipProps, "freshness">) {
  const statusLabel = STATUS_LABELS[freshness.status];
  const detail = freshness.label.replace(/^Atualizado\s+/i, "").replace(/^Preço pode estar defasado\s*/i, "");
  return <div className="flex items-center gap-1.5"><span className="font-semibold">{statusLabel}</span>{freshness.status !== "unknown" && <span className="text-muted-foreground">· {detail}</span>}</div>;
}

function TooltipDateDetails({ date }: { date: Date | null }) {
  if (!date) return <div className="leading-snug text-muted-foreground">O fornecedor não informou a data da última atualização deste preço.</div>;
  const shortDate = formatPriceDateShort(date);
  const longDate = formatPriceDateLong(date);
  const exactDateTime = formatExactDateTime(date);
  return (
    <>
      <div className="leading-snug"><span className="text-muted-foreground">Atualizado</span>{" "}<span className="tabular-nums font-medium">em {shortDate}</span><span className="text-muted-foreground"> ({longDate})</span></div>
      {exactDateTime && <div className="leading-snug text-[11px] text-muted-foreground tabular-nums">Hora local: {exactDateTime}</div>}
    </>
  );
}

function TooltipRecommendation({ status }: { status: PriceFreshnessStatus }) {
  if (status === "stale") return <div className="leading-snug text-amber-600 dark:text-amber-400">Confirme o valor com o fornecedor antes de enviar o orçamento ao cliente.</div>;
  if (status === "aging") return <div className="leading-snug text-muted-foreground">Recomendamos confirmar o valor antes de fechar o orçamento.</div>;
  return null;
}

function FreshnessTooltipBody({ freshness, priceUpdatedAt }: FreshnessTooltipProps) {
  const dateValue = optionalDate(priceUpdatedAt);
  const rule = buildClassificationRule(freshness.thresholdDays);

  return (
    <div className="flex flex-col gap-1.5">
      <TooltipStatusLine freshness={freshness} />
      <TooltipDateDetails date={dateValue} />
      <div className="leading-snug text-muted-foreground">{rule}</div>
      <TooltipRecommendation status={freshness.status} />
    </div>
  );
}

export interface PriceFreshnessBadgeProps {
  priceUpdatedAt?: string | Date | null;
  thresholdDays?: number | null;
  variant?: "inline" | "compact" | "icon-only" | "pdp";
  className?: string;
  /** Force render even when status is `fresh`/`unknown` in compact/icon-only variants. */
  alwaysShow?: boolean;
  /**
   * Quando informado, o badge passa a expor a ação "Confirmei com fornecedor"
   * para itens aging/stale ainda não confirmados. Após o clique, o consumidor
   * deve atualizar `confirmedAt` para que o badge entre no estado "confirmado".
   * Sem esta prop o badge continua somente leitura (catálogo/PDP padrão).
   */
  onConfirm?: () => void;
  /**
   * ISO timestamp do momento em que o vendedor confirmou o preço com o
   * fornecedor neste contexto (ex.: orçamento). Quando preenchido, o alerta
   * stale/aging é substituído por um pill verde "Confirmado por você".
   */
  confirmedAt?: string | Date | null;
}

function formatConfirmedRelative(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "agora";
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return formatPriceDateLong(d);
}

/**
 * Threshold é "explícito" quando vem do produto (não é o default global).
 * Só nesse caso enriquecemos o badge com "(limite Yd)" — caso contrário
 * o sufixo poluiria a UI de >99% do catálogo que ainda não tem o campo.
 */
function hasExplicitThreshold(
  thresholdDays?: number | null,
): thresholdDays is number {
  return typeof thresholdDays === "number" && thresholdDays > 0;
}

const STATUS_STYLES: Record<
  PriceFreshnessStatus,
  { color: string; Icon: typeof Clock }
> = {
  // amber-700 garante contraste ≥ 4.5:1 (WCAG AA) sobre fundos claros e
  // ≥ 4.6:1 com amber-300 no dark mode — necessário para aging/stale que
  // sempre carregam um ícone de alerta junto ao preço.
  fresh: { color: "text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
  aging: { color: "text-amber-700 dark:text-amber-300", Icon: Clock },
  stale: { color: "text-amber-700 dark:text-amber-300", Icon: AlertTriangle },
  unknown: { color: "text-muted-foreground", Icon: HelpCircle },
};

function formatCompactRelative(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "hoje";
  if (days < 30) return `há ${days}d`;
  if (days < 365) return `há ${Math.floor(days / 30)}m`;
  return `há ${Math.floor(days / 365)}a`;
}

/**
 * Padrão único pt-BR para a data absoluta exibida no corpo do badge:
 * "DD/MM/AAAA". Usado em todas as variantes (inline, compact, pdp) para
 * garantir consistência entre cards, lista e tabela. A data por extenso
 * + hora local fica reservada ao tooltip (camada de detalhamento).
 */
function formatAbsoluteDate(value: string | Date): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return formatPriceDateShort(d);
}

function formatRelativeDaysShort(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

interface BadgeBodyProps {
  freshness: PriceFreshness;
  priceUpdatedAt?: string | Date | null;
  limitSuffix: string;
  ariaLabel: string;
  title: string;
  color: string;
  StatusIcon: typeof Clock;
  className?: string;
}

const FOCUS_RING = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

function IconOnlyBody({ ariaLabel, title, color, StatusIcon: statusIcon, className }: BadgeBodyProps) {
  const StatusIconComponent = statusIcon;
  return <span role="status" aria-label={ariaLabel} title={title} tabIndex={0} className={cn("inline-flex items-center justify-center", color, FOCUS_RING, className)}><StatusIconComponent className="h-3.5 w-3.5" aria-hidden="true" /></span>;
}

function CompactBody(props: BadgeBodyProps) {
  const { freshness, priceUpdatedAt, limitSuffix, ariaLabel, title, color, StatusIcon, className } = props;
  const compactDate = priceUpdatedAt ? formatAbsoluteDate(priceUpdatedAt) : null;
  return (
    <span role="status" aria-label={ariaLabel} title={title} tabIndex={0} className={cn("inline-flex items-center gap-1 text-xs font-medium", color, FOCUS_RING, className)}>
      <StatusIcon className="h-3 w-3" aria-hidden="true" />
      <span className="tabular-nums">
        {formatCompactRelative(freshness.daysSinceUpdate)}
        {compactDate && <span className="text-muted-foreground"> · em {compactDate}</span>}
        {limitSuffix && <span className="text-muted-foreground">{limitSuffix}</span>}
      </span>
    </span>
  );
}

function PdpStaleBody({ ariaLabel, className, absolute, relative }: BadgeBodyProps & { absolute: string | null; relative: string }) {
  return (
    <div role="status" aria-label={ariaLabel} className={cn("inline-flex items-start gap-2.5 rounded-xl border-[1.5px] border-amber-300 bg-amber-100/80 px-3.5 py-2.5 text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-200", className)}>
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex flex-col gap-0.5 leading-tight">
        <span className="font-display font-semibold text-sm">Preço pode estar defasado</span>
        {absolute && <span className="text-xs text-amber-800/90 dark:text-amber-200/80 tabular-nums">Última atualização em {absolute} ({relative})</span>}
        <span className="text-[11px] text-amber-800/80 dark:text-amber-200/70">Confirme com o fornecedor antes de fechar o orçamento.</span>
      </div>
    </div>
  );
}

function PdpAgingBody({ ariaLabel, className, absolute, relative, limitSuffix }: BadgeBodyProps & { absolute: string; relative: string }) {
  return <span role="status" aria-label={ariaLabel} className={cn("inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300", className)}><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="tabular-nums">Atualizado em {absolute}<span className="text-amber-700/70 dark:text-amber-300/70"> · {relative}</span>{limitSuffix}</span></span>;
}

function PdpFreshBody({ ariaLabel, className, absolute, relative, limitSuffix }: BadgeBodyProps & { absolute: string; relative: string }) {
  return <span role="status" aria-label={ariaLabel} className={cn("inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400", className)}><CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="tabular-nums">Atualizado em {absolute}<span className="text-emerald-700/70 dark:text-emerald-400/70"> · {relative}</span>{limitSuffix}</span></span>;
}

function PdpUnknownBody({ ariaLabel, className }: BadgeBodyProps) {
  return <span role="status" aria-label={ariaLabel} className={cn("inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground", className)}><HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>Data de atualização não informada</span></span>;
}

function PdpBody(props: BadgeBodyProps) {
  const absolute = props.priceUpdatedAt ? formatAbsoluteDate(props.priceUpdatedAt) : null;
  const relative = formatRelativeDaysShort(props.freshness.daysSinceUpdate);
  if (props.freshness.status === "stale") return PdpStaleBody({ ...props, absolute, relative });
  if (props.freshness.status === "aging" && absolute) return PdpAgingBody({ ...props, absolute, relative });
  if (props.freshness.status === "fresh" && absolute) return PdpFreshBody({ ...props, absolute, relative });
  return PdpUnknownBody(props);
}

function InlineBody(props: BadgeBodyProps) {
  const { freshness, priceUpdatedAt, limitSuffix, ariaLabel, title, color, StatusIcon, className } = props;
  const inlineDate = priceUpdatedAt ? formatAbsoluteDate(priceUpdatedAt) : null;
  return (
    <span role="status" aria-label={ariaLabel} title={title} className={cn("inline-flex items-center gap-1.5 text-xs font-medium", color, className)}>
      <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{freshness.label}{inlineDate && <span className="text-muted-foreground tabular-nums"> · em {inlineDate}</span>}{limitSuffix}</span>
    </span>
  );
}

function StandardBadgeBody({ variant, ...props }: BadgeBodyProps & { variant: PriceFreshnessBadgeProps["variant"] }) {
  if (variant === "icon-only") return IconOnlyBody(props);
  if (variant === "compact") return CompactBody(props);
  if (variant === "pdp") return PdpBody(props);
  return InlineBody(props);
}

function ConfirmedBody({ variant, label, className }: { variant: PriceFreshnessBadgeProps["variant"]; label: string; className?: string }) {
  if (variant === "icon-only") return <span role="status" aria-label={label} className={cn("inline-flex items-center justify-center text-emerald-600 dark:text-emerald-500", className)}><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /></span>;
  if (variant === "compact") return <span role="status" aria-label={label} className={cn("inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-500", className)}><ShieldCheck className="h-3 w-3" aria-hidden="true" /><span>Confirmado</span></span>;
  return <span role="status" aria-label={label} className={cn("inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400", className)}><ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>Confirmado com fornecedor</span></span>;
}

function ConfirmedBadge({ freshness, priceUpdatedAt, confirmedAt, variant, className }: {
  freshness: PriceFreshness;
  priceUpdatedAt?: string | Date | null;
  confirmedAt: string | Date;
  variant: PriceFreshnessBadgeProps["variant"];
  className?: string;
}) {
  const relative = formatConfirmedRelative(confirmedAt);
  const confirmedLabel = `Preço confirmado por você ${relative}`;
  const body = ConfirmedBody({ variant, label: confirmedLabel, className });
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild>{body}</TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs"><div className="flex flex-col gap-1.5"><div className="font-semibold">Preço confirmado com fornecedor</div><div className="leading-snug text-muted-foreground">Você validou este preço {relative}. O alerta de preço defasado fica suprimido neste contexto até o próximo recálculo.</div><FreshnessTooltipBody freshness={freshness} priceUpdatedAt={priceUpdatedAt} /></div></TooltipContent></Tooltip></TooltipProvider>;
}

function BadgeWithTooltip({ body, freshness, priceUpdatedAt }: { body: ReactNode; freshness: PriceFreshness; priceUpdatedAt?: string | Date | null }) {
  return <TooltipProvider delayDuration={150}><Tooltip><TooltipTrigger asChild>{body}</TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs"><FreshnessTooltipBody freshness={freshness} priceUpdatedAt={priceUpdatedAt} /></TooltipContent></Tooltip></TooltipProvider>;
}

function ConfirmPriceAction({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  return <button type="button" onClick={(event) => { event.stopPropagation(); event.preventDefault(); onConfirm(); }} className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20" aria-label="Confirmar que validei este preço com o fornecedor"><ShieldCheck className="h-3 w-3" aria-hidden="true" /><span>{label}</span></button>;
}

function thresholdSuffix(thresholdDays?: number | null): string {
  return hasExplicitThreshold(thresholdDays) ? ` (limite ${thresholdDays}d)` : "";
}

function confirmedWarning(confirmedAt: string | Date | null | undefined, freshness: PriceFreshness): boolean {
  return Boolean(confirmedAt) && freshness.shouldWarn;
}

function canConfirmPrice(onConfirm: (() => void) | undefined, freshness: PriceFreshness, confirmed: boolean): onConfirm is () => void {
  return typeof onConfirm === "function" && freshness.shouldWarn && !confirmed;
}

function hidesQuietStatus(variant: PriceFreshnessBadgeProps["variant"], alwaysShow: boolean, freshness: PriceFreshness): boolean {
  const quietVariant = variant === "compact" || variant === "icon-only";
  return !alwaysShow && quietVariant && !freshness.shouldWarn;
}

function confirmActionLabel(variant: PriceFreshnessBadgeProps["variant"]): string {
  return variant === "compact" || variant === "icon-only" ? "Confirmei" : "Confirmei com fornecedor";
}

export function PriceFreshnessBadge({
  priceUpdatedAt,
  thresholdDays,
  variant = "inline",
  className,
  alwaysShow = false,
  onConfirm,
  confirmedAt,
}: PriceFreshnessBadgeProps) {
  const freshness = getPriceFreshness(priceUpdatedAt, thresholdDays); const { Icon, color } = STATUS_STYLES[freshness.status];

  // Sufixo "(limite Yd)" só aparece quando o produto traz threshold próprio.
  // Para o resto do catálogo (default global de 60d) o badge segue limpo.
  const limitSuffix = thresholdSuffix(thresholdDays);

  // Estado "confirmado pelo vendedor" — substitui o alerta stale/aging por um
  // pill verde discreto. Só faz sentido quando o item realmente entrava em
  // alerta; para `fresh`/`unknown` ignoramos (não polui o catálogo padrão).
  const isConfirmed = confirmedWarning(confirmedAt, freshness);
  const canOfferConfirm = canConfirmPrice(onConfirm, freshness, isConfirmed);

  // Quiet variants only render when there's something worth flagging.
  if (hidesQuietStatus(variant, alwaysShow, freshness)) {
    return null;
  }

  // Estado "confirmado pelo vendedor" — pill verde discreto que substitui o
  // alerta. Mantém o tooltip (mostra data SSOT + regra) para auditoria.
  if (isConfirmed) {
    return <ConfirmedBadge freshness={freshness} priceUpdatedAt={priceUpdatedAt} confirmedAt={confirmedAt as string | Date} variant={variant} className={className} />;
  }

  const { ariaLabel, title } = buildAccessibleLabel(freshness, priceUpdatedAt);

  const body = StandardBadgeBody({ variant, freshness, priceUpdatedAt, limitSuffix, ariaLabel, title, color, StatusIcon: Icon, className });
  const tooltipped = <BadgeWithTooltip body={body} freshness={freshness} priceUpdatedAt={priceUpdatedAt} />;

  // Sem ação individual configurada → comportamento clássico (somente leitura).
  if (!canOfferConfirm) return tooltipped;

  // Com ação configurada → agrupa o badge + botão "Confirmei com fornecedor".
  // Em variants compactas o CTA encolhe para "Confirmei" para caber em linha.
  const ctaLabel = confirmActionLabel(variant);
  return (
    <span className="inline-flex items-center gap-1.5">
      {tooltipped}
      <ConfirmPriceAction label={ctaLabel} onConfirm={onConfirm} />
    </span>
  );
}
