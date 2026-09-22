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
}

export function useQuoteApprovalToken(token: string | null | undefined) {
  return useQuery({
    queryKey: ["quote-approval-token", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_quote_approval", { _token: token! });
      if (error) throw error;
      return data as PublicQuoteApproval | null;
    },
  });
}
