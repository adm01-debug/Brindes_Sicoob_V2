import { supabase } from "@/integrations/supabase/client";

export const sicoobApprovalService = {
  async requestOrderApproval(params: {
    orderId: string;
    expectedStatus: string;
    reason: string;
    threshold: number;
    isEscalated?: boolean;
  }): Promise<string> {
    const { data, error } = await supabase.rpc('request_sicoob_order_approval', {
      p_order_id: params.orderId,
      p_expected_status: params.expectedStatus,
      p_reason: params.reason,
      p_threshold: params.threshold,
      p_is_escalated: params.isEscalated ?? false,
    });

    if (error) throw error;
    return data;
  },

  async listPendingApprovals() {
    const { data, error } = await supabase
      .from('sicoob_approval_requests')
      .select(`
        *,
        sicoob_orders (
          id,
          total_amount,
          status,
          created_by,
          postos_atendimento (nome),
          created_at
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // sicoob_orders.created_by referencia auth.users(id), sem FK para profiles —
    // o PostgREST não consegue embutir `profiles:created_by(...)`. Busca-se à parte.
    const creatorIds = Array.from(
      new Set(
        (data ?? [])
          .map((r) => r.sicoob_orders?.created_by)
          .filter((id): id is string => !!id)
      )
    );
    const profileMap = new Map<string, { full_name: string | null }>();
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', creatorIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.user_id, { full_name: p.full_name });
      }
    }

    return (data ?? []).map((r) => ({
      ...r,
      sicoob_orders: r.sicoob_orders
        ? {
            ...r.sicoob_orders,
            profiles: r.sicoob_orders.created_by
              ? profileMap.get(r.sicoob_orders.created_by) ?? null
              : null,
          }
        : null,
    }));
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

  async rejectOrderWithoutApproval(orderId: string, expectedStatus: string, reason: string) {
    const { error } = await supabase.rpc('reject_sicoob_order_without_approval', {
      p_order_id: orderId,
      p_expected_status: expectedStatus,
      p_reason: reason,
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
