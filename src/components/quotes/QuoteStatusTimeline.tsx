import { Check, Clock, FileText, RefreshCw, Send, Shield, ThumbsDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuoteStatusTimelineProps {
  status: string;
  createdAt?: string;
  updatedAt?: string;
  clientResponseAt?: string;
  isSyncing?: boolean;
}

const steps = [
  { key: "draft",                    label: "Rascunho",              icon: FileText },
  { key: "pending_approval",         label: "Alçada Admin",          icon: Shield },
  { key: "pending_singular_approval", label: "Análise Singular",      icon: Shield },
  { key: "pending",                  label: "Pendente",              icon: Clock },
  { key: "syncing",                  label: "Sincronizando",         icon: RefreshCw },
  { key: "sent",                     label: "Enviado",               icon: Send },
];

const statusOrder: Record<string, number> = {
  draft:                     0,
  pending_approval:          1,
  pending_singular_approval: 2,
  pending:                   3,
  sent:                      5,
  approved:                  5,
  approved_singular:         5,
  rejected:                  5,
  rejected_singular:         5,
  expired:                   5,
};

function formatTs(ts?: string) {
  if (!ts) return null;
  try {
    return format(new Date(ts), "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return null;
  }
}

type TimelineStep = (typeof steps)[number];

function withoutApprovalSteps() {
  return steps.filter(step => step.key !== "pending_approval" && step.key !== "pending_singular_approval");
}

function finalStep(step: TimelineStep, options: { index: number; length: number; rejected: boolean; expired: boolean }): TimelineStep {
  if (options.index !== options.length - 1) return step;
  if (options.rejected) return { key: "rejected", label: "Rejeitado", icon: ThumbsDown };
  if (options.expired) return { key: "expired", label: "Expirado", icon: AlertTriangle };
  return step;
}

function statusFlags(status: string) {
  return { pendingApproval: status === "pending_approval", pendingSingular: status === "pending_singular_approval",
    rejected: status === "rejected" || status === "rejected_singular", expired: status === "expired" };
}

function timelineCurrentIndex(status: string, activeSteps: TimelineStep[], isSyncing: boolean) {
  const stepIndex = activeSteps.findIndex(step => step.key === status);
  const baseIndex = stepIndex >= 0 ? stepIndex : Math.min(statusOrder[status] ?? 0, activeSteps.length);
  const syncIndex = activeSteps.findIndex(step => step.key === "syncing");
  return isSyncing && syncIndex >= 0 ? syncIndex : baseIndex;
}

function buildTimeline(status: string, isSyncing: boolean) {
  const flags = statusFlags(status);
  const activeSteps = flags.pendingApproval || flags.pendingSingular ? steps : withoutApprovalSteps();
  const relevant = flags.pendingApproval || flags.pendingSingular || (statusOrder[status] ?? 0) > 0 ? steps : withoutApprovalSteps();
  const displaySteps = relevant.map((step, index) => finalStep(step, { index, length: relevant.length, rejected: flags.rejected, expired: flags.expired }));
  return { displaySteps, currentIdx: timelineCurrentIndex(status, activeSteps, isSyncing), isPendingApproval: flags.pendingApproval,
    isPendingSingular: flags.pendingSingular, isRejected: flags.rejected, isExpired: flags.expired, isFinalNegative: flags.rejected || flags.expired };
}

type TimelineModel = ReturnType<typeof buildTimeline>;

function circleState(model: TimelineModel, step: TimelineStep, completed: boolean, current: boolean) {
  if (completed) return "bg-primary border-primary text-primary-foreground";
  if (!current) return "border-muted-foreground/30 text-muted-foreground/40";
  if (model.isPendingApproval && step.key === "pending_approval") return "border-amber-500 bg-amber-500/10 text-amber-500 ring-2 ring-amber-500/20";
  if (model.isPendingSingular && step.key === "pending_singular_approval") return "border-emerald-500 bg-emerald-500/10 text-emerald-500 ring-2 ring-emerald-500/20";
  if (model.isRejected) return "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20";
  if (model.isExpired) return "border-muted-foreground bg-muted text-muted-foreground ring-2 ring-muted-foreground/20";
  if (step.key === "syncing") return "border-success bg-primary/10 text-primary ring-2 ring-primary/20";
  return "border-primary bg-primary/10 text-primary ring-2 ring-primary/20";
}

function labelState(model: TimelineModel, step: TimelineStep, completed: boolean, current: boolean) {
  if (completed) return "text-primary";
  if (!current) return "text-muted-foreground/50";
  if (model.isRejected) return "text-destructive font-semibold";
  if (model.isExpired) return "text-muted-foreground font-semibold";
  return step.key === "syncing" || !model.isFinalNegative ? "text-primary font-semibold" : undefined;
}

function StepIcon({ step, completed, current }: { step: TimelineStep; completed: boolean; current: boolean }) {
  if (completed) return <Check className="h-4 w-4" />;
  const Icon = step.icon;
  return <Icon className={cn("h-4 w-4", current && step.key === "syncing" && "animate-spin")} />;
}

function stepTimestamp(options: { index: number; current: boolean; step: TimelineStep; model: TimelineModel; props: QuoteStatusTimelineProps }) {
  const { index, current, step, model, props } = options;
  if (index === model.displaySteps.length - 1 && (props.status === "approved" || model.isRejected)) return formatTs(props.clientResponseAt || props.updatedAt);
  if (index === 0) return formatTs(props.createdAt);
  return current && !props.isSyncing && step.key !== "syncing" ? formatTs(props.updatedAt) : null;
}

function TimelineStepView({ step, index, model, props }: { step: TimelineStep; index: number; model: TimelineModel; props: QuoteStatusTimelineProps }) {
  const completed = index < model.currentIdx;
  const current = index === model.currentIdx;
  const timestamp = stepTimestamp({ index, current, step, model, props });
  return <div className="flex items-center flex-1 last:flex-none"><div className="flex flex-col items-center gap-1">
    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all", circleState(model, step, completed, current))}><StepIcon step={step} completed={completed} current={current} /></div>
    <span className={cn("text-xs font-medium whitespace-nowrap", labelState(model, step, completed, current))}>{step.label}</span>
    {timestamp && <span className="text-[10px] text-muted-foreground">{timestamp}</span>}
  </div>{index < model.displaySteps.length - 1 && <div className={cn("flex-1 h-0.5 mx-1 rounded-full transition-all", index < model.currentIdx ? "bg-primary" : "bg-muted-foreground/20")} />}</div>;
}

export function QuoteStatusTimeline(props: QuoteStatusTimelineProps) {
  const model = buildTimeline(props.status, Boolean(props.isSyncing));

  return <div className="flex items-center w-full gap-0">{model.displaySteps.map((step, index) => <TimelineStepView key={step.key} step={step} index={index} model={model} props={props} />)}</div>;
}
