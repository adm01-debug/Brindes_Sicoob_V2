import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderBudgetIntelligenceProps {
  orderTotal: number;
  remainingBudget: number;
  allocatedBudget: number;
  paName: string;
}

export function OrderBudgetIntelligence({
  orderTotal,
  remainingBudget,
  allocatedBudget,
  paName
}: OrderBudgetIntelligenceProps) {
  const hasBudget = Number.isFinite(allocatedBudget) && allocatedBudget > 0;
  const usedAfterOrder = allocatedBudget - remainingBudget + orderTotal;
  const percentageAfterOrder = hasBudget
    ? Math.min(Math.max((usedAfterOrder / allocatedBudget) * 100, 0), 100)
    : 0;
  const isOverBudget = hasBudget && orderTotal > remainingBudget;
  const impact = hasBudget ? (orderTotal / allocatedBudget) * 100 : null;
  const status = getBudgetStatus(hasBudget, isOverBudget);

  return (
    <Card className="border-border/40 overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-2 border-b border-border/20 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sicoob-green" />
            Inteligência Orçamentária - {paName}
          </CardTitle>
          <Badge variant={isOverBudget ? "destructive" : "outline"} className="text-[10px] uppercase font-bold tracking-tighter">
            {status.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Verba Total</p>
            <p className="text-lg font-display font-bold">{formatBudget(allocatedBudget, hasBudget, "Não configurada")}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Disponível</p>
            <p className={cn("text-lg font-display font-bold", status.remainingClass)}>
              {formatBudget(remainingBudget, hasBudget, "Indisponível")}
            </p>
          </div>
        </div>

        <BudgetUsage hasBudget={hasBudget} percentage={percentageAfterOrder} impact={impact} isOverBudget={isOverBudget} />

        <div className={cn(
          "p-3 rounded-lg flex items-start gap-3 border",
          status.containerClass
        )}>
          <status.Icon className={cn("h-4 w-4 mt-0.5 shrink-0", status.iconClass)} />
          <div className="space-y-1">
            <p className="text-xs font-bold leading-none">{status.title}</p>
            <p className="text-[10px] text-muted-foreground">{status.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetUsage({
  hasBudget,
  percentage,
  impact,
  isOverBudget,
}: {
  hasBudget: boolean;
  percentage: number;
  impact: number | null;
  isOverBudget: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="flex items-center gap-1">
          <Wallet className="h-3 w-3" /> Uso da Verba Mensal
        </span>
        <span>{hasBudget ? `${percentage.toFixed(1)}%` : "—"}</span>
      </div>
      {hasBudget ? <Progress value={percentage} className="h-1.5" indicatorClassName={isOverBudget ? "bg-destructive" : "bg-sicoob-green"} /> : <div className="h-1.5 rounded-full bg-muted" aria-hidden="true" />}
      <p className="text-[9px] text-muted-foreground italic">
        {impact === null ? "* O impacto do pedido não pode ser calculado sem verba mensal configurada." : <>* Este pedido representa <strong>{impact.toFixed(1)}%</strong> da verba total do período.</>}
      </p>
    </div>
  );
}

function formatBudget(value: number, hasBudget: boolean, unavailableLabel: string) {
  return hasBudget ? `R$ ${value.toLocaleString("pt-BR")}` : unavailableLabel;
}

function getBudgetStatus(hasBudget: boolean, isOverBudget: boolean) {
  if (!hasBudget) {
    return {
      badge: "Verba indisponível",
      title: "Análise indisponível",
      description: "Cadastre a verba mensal da PA para avaliar o consumo deste pedido.",
      Icon: AlertCircle,
      iconClass: "text-muted-foreground",
      containerClass: "bg-muted/30 border-border/40",
      remainingClass: "text-muted-foreground",
    };
  }

  if (isOverBudget) {
    return {
      badge: "Consumo acima do saldo",
      title: "Alerta de Limite Excedido",
      description: "O valor do pedido excede o saldo atual. Será necessária aprovação da Singular ou remanejamento.",
      Icon: AlertCircle,
      iconClass: "text-destructive",
      containerClass: "bg-destructive/5 border-destructive/20",
      remainingClass: "text-destructive",
    };
  }

  return {
    badge: "Consumo calculado",
    title: "Consumo dentro do saldo",
    description: "O valor do pedido está dentro do saldo mensal informado para este Ponto de Atendimento.",
    Icon: CheckCircle2,
    iconClass: "text-sicoob-green",
    containerClass: "bg-sicoob-green/5 border-sicoob-green/20",
    remainingClass: "text-sicoob-green",
  };
}
