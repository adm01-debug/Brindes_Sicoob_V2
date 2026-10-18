export type OrderStatus =
  | "rascunho"
  | "enviado_gestor"
  | "aprovado_gestor"
  | "enviado_vendedor"
  | "em_producao"
  | "em_separacao"
  | "em_transporte"
  | "entregue"
  | "concluido"
  | "cancelado";

export interface OrderRow {
  id: string;
  order_number: string;
  status: OrderStatus;
  fulfillment_status: string;
  total: number | null;
  subtotal: number | null;
  discount_amount: number | null;
  shipping_cost: number | null;
  shipping_type: string | null;
  tracking_number: string | null;
  delivery_time: string | null;
  payment_terms: string | null;
  client_id: string | null;
  client_name: string | null;
  client_company: string | null;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  internal_notes: string | null;
  quote_id: string | null;
  seller_id: string;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string | null;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number | null;
  unit_price: number | null;
  created_at?: string;
}

export interface OrderLogistics {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: string | null;
  shipping_type: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderInvoice {
  id: string;
  order_id: string;
  invoice_number: string;
  amount: number;
  status: string;
  access_key: string | null;
  serie: string | null;
  issue_date: string | null;
  due_date: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderComment {
  id: string;
  order_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  attachments: Json | null;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface OrderFilters {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  endDateExclusive?: string;
  clientCompany?: string;
}
import type { Json } from "@/integrations/supabase/types";
