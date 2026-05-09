import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Wallet, BarChart3 } from "lucide-react";
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
  const percentageAfterOrder = useMemo(() => {
    if (allocatedBudget === 0) return 0;
    const used = allocatedBudget - remainingBudget;
    const totalUsed = used + orderTotal;
    return Math.min((totalUsed / allocatedBudget) * 100, 100);
  }, [orderTotal, remainingBudget, allocatedBudget]);

  const isOverBudget = orderTotal > remainingBudget;
  const impact = (orderTotal / allocatedBudget) * 100;

  return (
    <Card className="border-border/40 overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-2 border-b border-border/20 bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sicoob-green" />
            Inteligência Orçamentária - {paName}
          </CardTitle>
          <Badge variant={isOverBudget ? "destructive" : "outline"} className="text-[10px] uppercase font-bold tracking-tighter">
            Análise em Tempo Real
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Verba Total</p>
            <p className="text-lg font-display font-bold">R$ {allocatedBudget.toLocaleString('pt-BR')}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Saldo Disponível</p>
            <p className={cn("text-lg font-display font-bold", isOverBudget ? "text-destructive" : "text-sicoob-green")}>
              R$ {remainingBudget.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Uso da Verba Trimestral
            </span>
            <span>{percentageAfterOrder.toFixed(1)}%</span>
          </div>
          <Progress value={percentageAfterOrder} className="h-1.5" indicatorClassName={isOverBudget ? "bg-destructive" : "bg-sicoob-green"} />
          <p className="text-[9px] text-muted-foreground italic">
            * Este pedido representa <strong>{impact.toFixed(1)}%</strong> da verba total do período.
          </p>
        </div>

        <div className={cn(
          "p-3 rounded-lg flex items-start gap-3 border",
          isOverBudget ? "bg-destructive/5 border-destructive/20" : "bg-sicoob-green/5 border-sicoob-green/20"
        )}>
          {isOverBudget ? (
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-sicoob-green mt-0.5 shrink-0" />
          )}
          <div className="space-y-1">
            <p className="text-xs font-bold leading-none">
              {isOverBudget ? "Alerta de Limite Excedido" : "Viabilidade Confirmada"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isOverBudget 
                ? "O valor do pedido excede o saldo atual. Será necessária aprovação da Singular ou remanejamento."
                : "Pedido dentro das diretrizes financeiras estabelecidas para este Ponto de Atendimento."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
