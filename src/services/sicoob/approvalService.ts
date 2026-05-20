import { supabase } from "@/integrations/supabase/client";

export const sicoobApprovalService = {
  async listPendingApprovals() {
    const { data, error } = await supabase
      .from('sicoob_approval_requests')
      .select(`
        *,
        sicoob_orders (
          id,
          total_amount,
          status,
          postos_atendimento (nome),
          created_at,
          profiles:created_by (full_name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async approveOrder(requestId: string, orderId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase.rpc('approve_sicoob_order', {
      p_request_id: requestId,
      p_order_id: orderId,
      p_manager_id: user.id
    });

    if (error) throw error;
  },

  async rejectOrder(requestId: string, orderId: string, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase.rpc('reject_sicoob_order', {
      p_request_id: requestId,
      p_order_id: orderId,
      p_manager_id: user.id,
      p_reason: reason
    });

    if (error) throw error;
  },

  async listLimitIncreaseRequests(paId: string) {
    const { data, error } = await supabase
      .from("limit_increase_requests")
      .select("*")
      .eq("pa_id", paId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createLimitIncreaseRequest(paId: string, amount: number, reason: string) {
    const { error } = await supabase.from("limit_increase_requests").insert({
      pa_id: paId,
      requested_limit: amount,
      reason: reason,
      status: 'pending'
    });
    
    if (error) throw error;
  }
};
