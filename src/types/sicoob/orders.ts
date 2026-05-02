export type OrderStatus = 'draft' | 'pending' | 'waiting_approval' | 'confirmed' | 'logistic' | 'rejected' | 'completed';

export interface StatusConfig {
  label: string;
  className: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground border-border/40" },
  pending: { label: "Pendente", className: "bg-status-production/10 text-status-production border-status-production/20" },
  waiting_approval: { label: "Aguardando Aprovação", className: "bg-accent/10 text-accent-foreground border-accent/20" },
  confirmed: { label: "Confirmado", className: "bg-status-delivered/10 text-status-delivered border-status-delivered/20" },
  logistic: { label: "Logística", className: "bg-status-transit/10 text-status-transit border-status-transit/20" },
  rejected: { label: "Rejeitado", className: "bg-destructive/10 text-destructive border-destructive/20" },
  completed: { label: "Concluído", className: "bg-status-completed/10 text-status-completed border-status-completed/20" },
};

export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

export const SICOOB_VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["waiting_approval", "cancelled"],
  waiting_approval: ["confirmed", "rejected", "cancelled"],
  confirmed: ["logistic", "cancelled"],
  logistic: ["completed", "cancelled"],
  rejected: ["draft", "pending"],
  completed: [],
  cancelled: [],
};

export function canSicoobTransitionTo(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  const validNext = SICOOB_VALID_TRANSITIONS[current] || [];
  return validNext.includes(next);
}


export interface SicoobOrder {
  id: string;
  order_number: string;
  cooperative_id: string;
  pa_id: string;
  created_by: string;
  status: OrderStatus;
  total_amount: number;
  notes?: string;
  delivery_address?: string;
  tracking_code?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export interface SicoobOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface SicoobOrderItemLog {
  id: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
  user?: {
    display_name: string;
  };
}
