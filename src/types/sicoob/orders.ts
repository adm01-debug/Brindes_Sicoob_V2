import type { Json } from "@/integrations/supabase/types";

export type OrderStatus = 'draft' | 'pending' | 'waiting_approval' | 'escalated_to_board' | 'confirmed' | 'logistic' | 'in_production' | 'in_separation' | 'in_transit' | 'delivered' | 'rejected' | 'completed' | 'cancelled';

export interface StatusConfig {
  label: string;
  className: string;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground border-border/40" },
  pending: { label: "Pendente", className: "bg-status-production/10 text-status-production border-status-production/20" },
  waiting_approval: { label: "Aguardando Aprovação", className: "bg-accent/10 text-accent-foreground border-accent/20" },
  escalated_to_board: { label: "Alçada Superior (Diretoria)", className: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmado", className: "bg-status-delivered/10 text-status-delivered border-status-delivered/20" },
  logistic: { label: "Logística (legado)", className: "bg-status-transit/10 text-status-transit border-status-transit/20" },
  in_production: { label: "Em Produção", className: "bg-status-production/10 text-status-production border-status-production/20" },
  in_separation: { label: "Em Separação", className: "bg-amber-100 text-amber-700 border-amber-200" },
  in_transit: { label: "Em Trânsito", className: "bg-status-transit/10 text-status-transit border-status-transit/20" },
  delivered: { label: "Entregue", className: "bg-status-delivered/10 text-status-delivered border-status-delivered/20" },
  rejected: { label: "Rejeitado", className: "bg-destructive/10 text-destructive border-destructive/20" },
  completed: { label: "Concluído", className: "bg-status-completed/10 text-status-completed border-status-completed/20" },
  cancelled: { label: "Cancelado", className: "bg-muted text-muted-foreground border-border/40" },
};

export const ORDER_STATUS_OPTIONS = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

export const SICOOB_VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["waiting_approval", "cancelled"],
  waiting_approval: ["confirmed", "rejected", "escalated_to_board", "cancelled"],
  escalated_to_board: ["confirmed", "rejected", "cancelled"],
  confirmed: ["in_production", "logistic", "cancelled"],
  logistic: ["completed", "cancelled"],
  in_production: ["in_separation", "cancelled"],
  in_separation: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: ["completed", "cancelled"],
  rejected: ["draft", "pending"],
  completed: [],
  cancelled: [],
};

export function canSicoobTransitionTo(current: OrderStatus, next: OrderStatus): boolean {
  if (current === next) return true;
  const validNext = SICOOB_VALID_TRANSITIONS[current] || [];
  return validNext.includes(next);
}

export function canEditSicoobOrderItems(status: OrderStatus): boolean {
  return status === 'draft';
}


export interface SicoobOrder {
  id: string;
  order_number: string;
  cooperative_id: string;
  pa_id: string;
  created_by: string;
  status: OrderStatus;
  total_amount: number;
  merchandise_amount?: number;
  personalization_amount?: number;
  negotiation_markup_amount?: number;
  commercial_subtotal_amount?: number;
  discount_amount?: number;
  shipping_amount?: number;
  pricing_formula_version?: 'legacy-v0' | 'brl-v1';
  notes?: string;
  source_quote_id?: string | null;
  source_quote_snapshot?: Record<string, unknown> | null;
  requires_artwork: boolean;
  delivery_address?: string;
  tracking_code?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  approval_policy_version?: string | null;
  sla_status?: 'normal' | 'warning' | 'critical';
  sla_deadline?: string;
  pa?: { nome: string };
  cooperativa?: { nome: string };
}
 
export interface SicoobOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_image_url?: string;
  variant_id?: string;
  variant_sku?: string;
  color_name?: string;
  color_hex?: string;
  size_code?: string;
  personalization_snapshot?: Record<string, unknown>;
  quantity: number;
  unit_price: number;
  total_price: number;
  personalization_amount?: number;
  line_total_amount?: number;
}

export interface SicoobOrderShipment {
  id: string;
  order_id: string;
  carrier_name: string | null;
  tracking_code: string | null;
  status: 'pending' | 'in_transit' | 'delivered';
  estimated_delivery: string | null;
  actual_delivery_at: string | null;
  delivery_photo_path: string | null;
  delivery_photo_uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SicoobBudget {
  id: string;
  pa_id: string;
  cooperative_id: string;
  verba_total: number;
  verba_consumida: number;
  mes: number;
  ano: number;
  updated_at: string;
  postos_atendimento?: { nome: string };
}

export interface SicoobApprovalRequest {
  id: string;
  order_id: string;
  status: 'pending' | 'approved' | 'rejected';
  amount_at_request: number;
  threshold_at_request: number;
  request_reason?: string;
  rejection_reason?: string;
  created_at: string;
  sicoob_orders?: Partial<SicoobOrder>;
}

export interface SicoobOrderItemLog {
  id: string;
  action: string;
  old_data: Json | null;
  new_data: Json | null;
  created_at: string;
  user?: {
    display_name: string;
  };
}
