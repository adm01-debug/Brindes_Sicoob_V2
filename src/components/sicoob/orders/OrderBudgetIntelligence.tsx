import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Wallet, BarChart3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolvePaBudgetState } from "@/lib/sicoob/paBudgetState";
import { projectOrderAgainstBudget } from "@/lib/sicoob/orderBudgetProjection";
import type { OrderStatus } from "@/types/sicoob/orders";

interface OrderBudgetIntelligenceProps {
  orderTotal: number;
  remainingBudget: number;
  allocatedBudget: number | null;
  paName: string;
  isLoading?: boolean;
  hasError?: boolean;
  hasPaId?: boolean;
  onRetry?: () => void;
  orderStatus?: OrderStatus | null;
}

type BudgetState = "unconfigured" | "over" | "available" | "consumed" | "inactive";
const POSITIVE_BUDGET_CLASS = "text-sicoob-green";
const MUTED_BUDGET_CLASS = "text-muted-foreground";

const BUDGET_STATUS = {
  unconfigured: {
    badge: "Verba não configurada",
    amountClass: MUTED_BUDGET_CLASS,
    panelClass: "bg-muted/30 border-border/50",
    Icon: AlertCircle,
    iconClass: MUTED_BUDGET_CLASS,
    title: "Análise indisponível",
    message: "A verba desta competência ainda não foi cadastrada. O sistema não presume um limite financeiro.",
  },
  over: {
    badge: "Dados da competência",
    amountClass: "text-destructive",
    panelClass: "bg-destructive/5 border-destructive/20",
    Icon: AlertCircle,
    iconClass: "text-destructive",
    title: "Alerta de Limite Excedido",
    message: "O valor do pedido excede o saldo atual. Será necessária aprovação da Singular ou remanejamento.",
  },
  available: {
    badge: "Dados da competência",
    amountClass: POSITIVE_BUDGET_CLASS,
    panelClass: "bg-sicoob-green/5 border-sicoob-green/20",
    Icon: CheckCircle2,
    iconClass: POSITIVE_BUDGET_CLASS,
    title: "Viabilidade Confirmada",
    message: "Pedido dentro das diretrizes financeiras estabelecidas para este Ponto de Atendimento.",
  },
  consumed: {
    badge: "Consumo registrado",
    amountClass: POSITIVE_BUDGET_CLASS,
    panelClass: "bg-sicoob-green/5 border-sicoob-green/20",
    Icon: CheckCircle2,
    iconClass: POSITIVE_BUDGET_CLASS,
    title: "Pedido já contabilizado",
    message: "O consumo deste pedido já está refletido no saldo; ele não será descontado novamente.",
  },
  inactive: {
    badge: "Pedido encerrado",
    amountClass: MUTED_BUDGET_CLASS,
    panelClass: "bg-muted/30 border-border/50",
    Icon: AlertCircle,
    iconClass: MUTED_BUDGET_CLASS,
    title: "Pedido sem consumo previsto",
    message: "Pedidos rejeitados ou cancelados não reservam verba para este período.",
  },
} as const;

function resolveBudgetState(allocatedBudget: number | null, isOverBudget: boolean, alreadyConsumed: boolean, hasNoBudgetImpact: boolean): BudgetState {
  if (allocatedBudget === null) return "unconfigured";
  if (alreadyConsumed) return "consumed";
  if (hasNoBudgetImpact) return "inactive";
  if (isOverBudget) return "over";
  return "available";
}

function getBudgetMetrics(configuredBudget: number | null, remainingBudget: number, orderTotal: number, orderStatus?: OrderStatus | null) {
  return projectOrderAgainstBudget({ allocatedBudget: configuredBudget, remainingBudget, orderTotal, orderStatus });
}

function getBudgetImpactLabel(configuredBudget: number | null, impact: number | null, hasNoBudgetImpact: boolean) {
  if (hasNoBudgetImpact) return "Este pedido encerrado não projeta consumo sobre o saldo.";
  if (impact !== null) {
    return <>* Este pedido representa <strong>{impact.toFixed(1)}%</strong> da verba total do período.</>;
  }
  if (configuredBudget === 0) {
    return "A verba está cadastrada com valor zero; o impacto percentual não pode ser calculado.";
  }
  return "Configure a verba da competência para calcular o impacto deste pedido.";
}

function BudgetAvailabilityCard({
  availability,
  hasPaId,
  paName,
  onRetry,
}: Pick<OrderBudgetIntelligenceProps, "hasPaId" | "paName" | "onRetry"> & { availability: "loading" | "unavailable" }) {
  const failed = availability === "unavailable";
  const title = availabilityTitle(availability, hasPaId);
  const message = availabilityMessage(availability, hasPaId);

  return (
    <Card className="border-border/40 overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-2 border-b border-border/20 bg-muted/30">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-sicoob-green" />
          Inteligência Orçamentária - {paName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-2 pt-4" role={failed ? "alert" : "status"}>
        {failed ? <AlertCircle className="h-5 w-5 text-destructive" /> : <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{message}</p>
        {failed && hasPaId && onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}>Tentar novamente</Button>}
      </CardContent>
    </Card>
  );
}

function availabilityTitle(state: "loading" | "unavailable", hasPaId?: boolean) {
  if (!hasPaId) return "PA não identificado";
  return state === "unavailable" ? "Verba indisponível" : "Consultando verba";
}

function availabilityMessage(state: "loading" | "unavailable", hasPaId?: boolean) {
  if (!hasPaId) return "Não foi possível identificar o PA deste pedido para consultar a verba.";
  return state === "unavailable"
    ? "Não foi possível consultar a verba desta competência. O saldo não foi presumido."
    : "Aguarde enquanto consultamos a verba desta competência.";
}

function BudgetNumbers({ allocatedBudget, remainingBudget, orderTotal, state, orderStatus }: {
  allocatedBudget: number | null;
  remainingBudget: number;
  orderTotal: number;
  state: BudgetState;
  orderStatus?: OrderStatus | null;
}) {
  const status = BUDGET_STATUS[state];
  const configuredBudget = state === "unconfigured" ? null : allocatedBudget;
  const { percentageAfterOrder, impact } = getBudgetMetrics(configuredBudget, remainingBudget, orderTotal, orderStatus);
  const allocatedLabel = configuredBudget === null ? "—" : `R$ ${configuredBudget.toLocaleString('pt-BR')}`;
  const remainingLabel = configuredBudget !== null ? `R$ ${remainingBudget.toLocaleString('pt-BR')}` : "—";
  const percentageLabel = configuredBudget !== null ? `${percentageAfterOrder.toFixed(1)}%` : "—";
  const impactLabel = getBudgetImpactLabel(configuredBudget, impact, orderStatus === "cancelled" || orderStatus === "rejected");
  const StatusIcon = status.Icon;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Verba Total</p>
          <p className="text-lg font-display font-bold">{allocatedLabel}</p>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Disponível</p>
          <p className={cn("text-lg font-display font-bold", status.amountClass)}>{remainingLabel}</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold">
          <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Uso da Verba Trimestral</span>
          <span>{percentageLabel}</span>
        </div>
        <Progress value={percentageAfterOrder} className="h-1.5" indicatorClassName={state === "over" ? "bg-destructive" : "bg-sicoob-green"} />
        <p className="text-[9px] text-muted-foreground italic">{impactLabel}</p>
      </div>
      <div className={cn("p-3 rounded-lg flex items-start gap-3 border", status.panelClass)}>
        <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", status.iconClass)} />
        <div className="space-y-1">
          <p className="text-xs font-bold leading-none">{status.title}</p>
          <p className="text-[10px] text-muted-foreground">{status.message}</p>
        </div>
      </div>
    </>
  );
}

export function OrderBudgetIntelligence({
  orderTotal,
  remainingBudget,
  allocatedBudget,
  paName,
  isLoading = false,
  hasError = false,
  hasPaId = true,
  onRetry,
  orderStatus,
}: OrderBudgetIntelligenceProps) {
  const availability = resolvePaBudgetState({ isLoading, hasError, hasPaId, hasBudget: allocatedBudget !== null });
  const projection = projectOrderAgainstBudget({ allocatedBudget, remainingBudget, orderTotal, orderStatus });
  const state = availability === "configured"
    ? resolveBudgetState(allocatedBudget, projection.isOverBudget, projection.alreadyConsumed, projection.hasNoBudgetImpact)
    : "unconfigured";
  const status = BUDGET_STATUS[state];

  if (availability === "loading" || availability === "unavailable") {
    return <BudgetAvailabilityCard availability={availability} hasPaId={hasPaId} paName={paName} onRetry={onRetry} />;
  }

  return (
    <Card className="border-border/40 overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-2 border-b border-border/20 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sicoob-green" />
            Inteligência Orçamentária - {paName}
          </CardTitle>
          <Badge variant={state === "over" ? "destructive" : "outline"} className="text-[10px] uppercase font-bold tracking-tighter">
            {status.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <BudgetNumbers allocatedBudget={allocatedBudget} remainingBudget={remainingBudget} orderTotal={orderTotal} state={state} orderStatus={orderStatus} />
      </CardContent>
    </Card>
  );
}
