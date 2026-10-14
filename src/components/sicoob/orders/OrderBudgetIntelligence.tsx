import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderBudgetIntelligenceProps {
  orderTotal: number;
  remainingBudget: number;
  allocatedBudget: number | null;
  paName: string;
}

type BudgetState = "unconfigured" | "over" | "available";

const BUDGET_STATUS = {
  unconfigured: {
    badge: "Verba não configurada",
    amountClass: "text-muted-foreground",
    panelClass: "bg-muted/30 border-border/50",
    Icon: AlertCircle,
    iconClass: "text-muted-foreground",
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
    amountClass: "text-sicoob-green",
    panelClass: "bg-sicoob-green/5 border-sicoob-green/20",
    Icon: CheckCircle2,
    iconClass: "text-sicoob-green",
    title: "Viabilidade Confirmada",
    message: "Pedido dentro das diretrizes financeiras estabelecidas para este Ponto de Atendimento.",
  },
} as const;

function resolveBudgetState(allocatedBudget: number | null, orderTotal: number, remainingBudget: number): BudgetState {
  if (allocatedBudget === null || allocatedBudget <= 0) return "unconfigured";
  if (orderTotal > remainingBudget) return "over";
  return "available";
}

export function OrderBudgetIntelligence({
  orderTotal,
  remainingBudget,
  allocatedBudget,
  paName
}: OrderBudgetIntelligenceProps) {
  const state = resolveBudgetState(allocatedBudget, orderTotal, remainingBudget);
  const status = BUDGET_STATUS[state];
  const StatusIcon = status.Icon;
  const configuredBudget = state === "unconfigured" ? null : allocatedBudget;
  const hasConfiguredBudget = configuredBudget !== null;
  const percentageAfterOrder = useMemo(() => {
    if (!allocatedBudget || allocatedBudget <= 0) return 0;
    const used = allocatedBudget - remainingBudget;
    const totalUsed = used + orderTotal;
    return Math.min((totalUsed / allocatedBudget) * 100, 100);
  }, [orderTotal, remainingBudget, allocatedBudget]);

  const impact = configuredBudget === null ? null : (orderTotal / configuredBudget) * 100;
  const allocatedLabel = configuredBudget === null ? "—" : `R$ ${configuredBudget.toLocaleString('pt-BR')}`;
  const remainingLabel = hasConfiguredBudget ? `R$ ${remainingBudget.toLocaleString('pt-BR')}` : "—";
  const percentageLabel = hasConfiguredBudget ? `${percentageAfterOrder.toFixed(1)}%` : "—";
  const impactLabel = impact === null
    ? "Configure a verba da competência para calcular o impacto deste pedido."
    : <>* Este pedido representa <strong>{impact.toFixed(1)}%</strong> da verba total do período.</>;

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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Verba Total</p>
            <p className="text-lg font-display font-bold">{allocatedLabel}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Disponível</p>
            <p className={cn("text-lg font-display font-bold", status.amountClass)}>
              {remainingLabel}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Uso da Verba Trimestral
            </span>
            <span>{percentageLabel}</span>
          </div>
          <Progress value={percentageAfterOrder} className="h-1.5" indicatorClassName={state === "over" ? "bg-destructive" : "bg-sicoob-green"} />
          <p className="text-[9px] text-muted-foreground italic">
            {impactLabel}
          </p>
        </div>

        <div className={cn(
          "p-3 rounded-lg flex items-start gap-3 border",
          status.panelClass,
        )}>
          <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", status.iconClass)} />
          <div className="space-y-1">
            <p className="text-xs font-bold leading-none">
              {status.title}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {status.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
