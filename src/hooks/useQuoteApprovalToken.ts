/**
 * useQuoteApprovalToken — busca dados do token público de aprovação de orçamento.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicQuoteApproval {
  quote_number: string;
  client_name: string | null;
  total: number;
  valid_until: string | null;
  status: "active" | "responded";
  response: "approved" | "rejected" | null;
  responded_at: string | null;
  expires_at: string | null;
  subtotal?: number | null;
  discount_amount?: number | null;
  shipping_cost?: number | null;
  payment_terms?: string | null;
  delivery_time?: string | null;
  notes?: string | null;
  items?: Array<{
    id: string;
    product_name: string;
    product_sku?: string | null;
    color_name?: string | null;
    size_code?: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    personalizations?: Array<{ technique_id?: string | null; colors_count?: number | null; positions_count?: number | null; notes?: string | null }>;
  }>;
}

export function useQuoteApprovalToken(token: string | null | undefined) {
  return useQuery({
    queryKey: ["quote-approval-token", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("quote-approval", {
        body: { action: "get_data", token },
      });
      if (error) throw error;
      if (!data || !("quote" in data)) throw new Error("Resposta inválida do serviço de aprovação.");
      return data.quote as PublicQuoteApproval | null;
    },
  });
}
