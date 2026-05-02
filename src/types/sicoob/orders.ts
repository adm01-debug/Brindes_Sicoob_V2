export type OrderStatus = 'draft' | 'pending' | 'waiting_approval' | 'confirmed' | 'logistic' | 'rejected' | 'completed';

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
