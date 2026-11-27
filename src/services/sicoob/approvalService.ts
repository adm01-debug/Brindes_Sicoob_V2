import { supabase } from "@/integrations/supabase/client";

const UNAUTHENTICATED_MESSAGE = "Usuário não autenticado";

export type ApprovalAuthority = {
  can_decide: boolean;
  source: "direct" | "delegated" | "none";
  delegation_id?: string | null;
  authority_delegator_id?: string | null;
  ends_at?: string | null;
};

const readAuthority = (value: unknown): ApprovalAuthority => {
  if (!value || typeof value !== "object") return { can_decide: false, source: "none" };
  const candidate = value as Partial<ApprovalAuthority>;
  if (!candidate.can_decide || !["direct", "delegated"].includes(candidate.source ?? "")) {
    return { can_decide: false, source: "none" };
  }
  return { ...candidate, can_decide: true, source: candidate.source as "direct" | "delegated" };
};

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

    return Promise.all((data ?? []).map(async (r) => {
      const [approveResult, rejectResult] = await Promise.all([
        supabase.rpc("sicoob_current_actor_approval_authority", {
          p_order_id: r.order_id,
          p_competence: "approve_order",
        }),
        supabase.rpc("sicoob_current_actor_approval_authority", {
          p_order_id: r.order_id,
          p_competence: "reject_order",
        }),
      ]);
      if (approveResult.error) throw approveResult.error;
      if (rejectResult.error) throw rejectResult.error;

      return {
        ...r,
        approval_authority: {
          approve: readAuthority(approveResult.data),
          reject: readAuthority(rejectResult.data),
        },
        sicoob_orders: r.sicoob_orders
          ? {
              ...r.sicoob_orders,
              profiles: r.sicoob_orders.created_by
                ? profileMap.get(r.sicoob_orders.created_by) ?? null
                : null,
            }
          : null,
      };
    }));
  },

  async approveOrder(requestId: string, orderId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(UNAUTHENTICATED_MESSAGE);

    const { error } = await supabase.rpc('approve_sicoob_order', {
      p_request_id: requestId,
      p_order_id: orderId,
      p_manager_id: user.id
    });

    if (error) throw error;
  },

  async rejectOrder(requestId: string, orderId: string, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(UNAUTHENTICATED_MESSAGE);

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

  // Fila de aprovação dos pedidos de aumento de verba. A RLS devolve apenas os
  // pedidos da cooperativa do usuário; `can_decide` diz, por linha, se ele tem
  // autoridade para decidir (admin global ou gestor_compras da cooperativa).
  async listPendingLimitIncreaseRequests() {
    const { data, error } = await supabase
      .from("limit_increase_requests")
      .select(`
        *,
        postos_atendimento (id, nome, cooperativa_id)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // requested_by referencia auth.users, sem FK para profiles — o PostgREST não
    // consegue embutir o nome do solicitante. Busca-se à parte (mesmo padrão de
    // listPendingApprovals).
    const requesterIds = Array.from(
      new Set(
        (data ?? [])
          .map((request) => request.requested_by)
          .filter((id): id is string => !!id),
      ),
    );
    const requesterNames = new Map<string, string | null>();
    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', requesterIds);
      for (const p of profiles ?? []) {
        requesterNames.set(p.user_id, p.full_name);
      }
    }

    return Promise.all((data ?? []).map(async (request) => {
      const { data: canDecide, error: authorityError } = await supabase.rpc(
        'can_decide_limit_increase',
        { p_request_id: request.id },
      );
      if (authorityError) throw authorityError;

      return {
        ...request,
        requester_name: request.requested_by
          ? requesterNames.get(request.requested_by) ?? null
          : null,
        can_decide: canDecide === true,
      };
    }));
  },

  async approveLimitIncreaseRequest(requestId: string) {
    const { data, error } = await supabase.rpc('decide_limit_increase_request', {
      p_request_id: requestId,
      p_approve: true,
    });

    if (error) throw error;
    return data;
  },

  async rejectLimitIncreaseRequest(requestId: string, reason: string) {
    const { data, error } = await supabase.rpc('decide_limit_increase_request', {
      p_request_id: requestId,
      p_approve: false,
      p_reason: reason,
    });

    if (error) throw error;
    return data;
  },

  // `amount` é o valor ADICIONAL digitado pelo gestor do PA; o contrato da
  // solicitação (fila de aprovação e RPC de decisão) trabalha com o TETO
  // absoluto em `requested_limit`. Derivar aqui evita que um pedido de
  // R$ 5.000 sobre uma verba de R$ 50.000 vire teto de R$ 5.000 na aprovação.
  async createLimitIncreaseRequest(
    paId: string,
    amount: number,
    reason: string,
    currentLimit?: number | null,
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error(UNAUTHENTICATED_MESSAGE);

    const adicional = Number(amount);
    if (!Number.isFinite(adicional) || adicional <= 0) {
      throw new Error('Informe um valor adicional maior que zero.');
    }

    const base = Number(currentLimit ?? 0);
    const novoLimite = Math.round((base + adicional) * 100) / 100;
    const justificativa = reason.trim();
    if (!justificativa) throw new Error('Informe a justificativa da solicitação.');

    const { error } = await supabase.from("limit_increase_requests").insert({
      pa_id: paId,
      requested_by: user.id,
      current_limit: currentLimit ?? null,
      requested_limit: novoLimite,
      reason: justificativa,
      status: 'pending'
    });
    
    if (error) throw error;
  }
};
