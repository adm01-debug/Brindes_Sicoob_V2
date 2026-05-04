import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useSicoobBudget } from "@/hooks/sicoob/useSicoobBudget";
import { formatCurrency } from "@/utils/formatters";

interface BudgetExceededBannerProps {
  currentTotal?: number;
}

export const BudgetExceededBanner: React.FC<BudgetExceededBannerProps> = ({ currentTotal = 0 }) => {
  const { data: budget } = useSicoobBudget();

  if (!budget) return null;

  const totalSpent = Number(budget.verba_consumida) + currentTotal;
  const isExceeded = totalSpent > Number(budget.verba_total);

  if (!isExceeded) return null;

  return (
    <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-4 duration-300" data-testid="budget-exceeded-banner">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="font-bold">Verba Estourada</AlertTitle>
      <AlertDescription>
        O total deste pedido ({formatCurrency(currentTotal)}) somado ao consumo atual ({formatCurrency(budget.verba_consumida)}) 
        excede seu limite mensal de {formatCurrency(budget.verba_total)}. 
        O pedido será encaminhado para aprovação de alçada do Gestor da Singular.
      </AlertDescription>
    </Alert>
  );
};
