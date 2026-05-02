export type OrderStatus = 'draft' | 'pending' | 'waiting_approval' | 'confirmed' | 'logistic' | 'rejected' | 'completed';

export interface StatusConfig {
  label: string;
  className: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: { label: "Rascunho", className: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  pending: { label: "Pendente", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  waiting_approval: { label: "Aguardando Aprovação", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  confirmed: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  logistic: { label: "Logística", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  rejected: { label: "Rejeitado", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  completed: { label: "Concluído", className: "bg-green-500/10 text-green-500 border-green-500/20" },
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
