import { AlertCircle, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSicoobBudget } from "@/hooks/sicoob/useSicoobBudget";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";

function budgetStyles(isLow: boolean) {
  return {
    container: isLow ? "space-y-1.5 p-3 rounded-lg border bg-warning/5 border-warning/30 transition-all duration-300" : "space-y-1.5 p-3 rounded-lg border bg-muted/30 border-border/50 transition-all duration-300",
    icon: isLow ? "h-4 w-4 text-warning" : "h-4 w-4 text-primary",
    progress: isLow ? "h-1.5 [&>div]:bg-warning" : "h-1.5",
    status: isLow ? "text-[10px] text-warning font-bold" : "text-[10px] text-muted-foreground",
  };
}

/** Saldo da verba do PA: usado no carrinho do cabeçalho e no mini carrinho. */
export function CartPaBudgetBalance() {
  const { paId } = useAuth();
  const { data: budget, isLoading } = useSicoobBudget();

  if (!paId) return null;
  if (isLoading) return <div className="text-[10px] text-muted-foreground px-1 py-0.5">Carregando saldo da verba…</div>;
  if (!budget) return null;

  const total = Number(budget.verba_total ?? 0);
  const consumed = Number(budget.verba_consumida ?? 0);
  const available = Math.max(0, total - consumed);
  const percent = total > 0 ? Math.min((consumed / total) * 100, 100) : 0;
  const isLow = percent >= 90;
  const styles = budgetStyles(isLow);

  return (
    <div className={styles.container} role="region" aria-label="Saldo de Verba do PA">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Wallet className={styles.icon} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider">Verba do PA</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{new Date().toLocaleString("pt-BR", { month: "short", year: "2-digit" })}</span>
      </div>
      <Progress value={percent} className={styles.progress} aria-label={`Verba consumida: ${percent.toFixed(0)}%`} />
      <div className="flex items-center justify-between" aria-live="polite">
        <span className={styles.status}>{percent.toFixed(0)}% utilizado</span>
        <span className="text-[10px] font-bold">Disponível: {formatCurrency(available)}</span>
      </div>
      {isLow && (
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-warning font-semibold bg-warning/10 p-1.5 rounded border border-warning/20" role="alert" aria-live="assertive">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Verba acima de 90% — novos pedidos podem exigir aprovação</span>
        </div>
      )}
    </div>
  );
}
