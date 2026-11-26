import { ShieldAlert } from "lucide-react";
import { useApprovalThreshold } from "@/hooks/admin/useApprovalThreshold";
import { formatCurrency } from "@/lib/utils";

export interface CartThresholdItem {
  product_price: number;
  quantity: number;
}

/**
 * Alcada que vale no carrinho do cabecalho. O aviso de heranca existe porque o
 * limite do mes anterior continua valendo, mas o comprador precisa saber que o
 * mes corrente ainda nao tem limite aprovado.
 */
export function CartApprovalThresholdNotice({ items }: { items: CartThresholdItem[] }) {
  const { threshold, competenceLabel, isCarryOver, needsApproval } = useApprovalThreshold(
    items.map((item) => ({ unit_price: item.product_price, quantity: item.quantity, category_id: null })),
  );

  if (threshold <= 0) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
  const over = needsApproval(subtotal);

  return (
    <div
      data-testid="cart-approval-threshold"
      className={over ? "space-y-1 p-3 rounded-lg border bg-destructive/5 border-destructive/30" : "space-y-1 p-3 rounded-lg border bg-muted/30 border-border/50"}
      role="region"
      aria-label="Alçada de aprovação do carrinho"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
          {isCarryOver ? `Alçada herdada de ${competenceLabel}` : `Alçada de ${competenceLabel}`}
        </span>
        <span className="text-[10px] font-bold">{formatCurrency(threshold)}</span>
      </div>
      {isCarryOver && (
        <p className="text-[10px] text-warning font-semibold" role="alert">
          Não há limite de alçada aprovado para o mês corrente; o limite acima é o último aprovado.
        </p>
      )}
      {over && (
        <p className="text-[10px] text-destructive font-semibold" role="alert">
          Este carrinho excede a alçada e exigirá aprovação do Gestor da Singular.
        </p>
      )}
    </div>
  );
}
