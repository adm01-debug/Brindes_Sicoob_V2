import { supabase } from "@/integrations/supabase/client";
import { beginReorderIntent, completeReorderIntent } from "./reorderIdempotency";
import {
  canSicoobTransitionTo,
  type OrderStatus,
  type SicoobOrder,
  type SicoobOrderItem,
  type SicoobOrderItemLog,
} from "@/types/sicoob/orders";

interface ApprovalTransitionInput {
  orderId: string;
  currentStatus: string;
  observations?: string;
}

async function prepareOrderConfirmation({ orderId, currentStatus, observations }: ApprovalTransitionInput): Promise<void> {
  const { error } = await supabase.rpc('prepare_sicoob_order_confirmation', {
    p_order_id: orderId,
    p_expected_status: currentStatus,
    p_comment: observations || null,
  });
  if (error) throw error;
}

async function escalateOrderApproval({ orderId, currentStatus, observations }: ApprovalTransitionInput): Promise<void> {
  const reason = observations?.trim() || '';
  if (reason.length < 10) {
    throw new Error('Informe uma justificativa de escalação com ao menos 10 caracteres.');
  }

  const { error } = await supabase.rpc('request_sicoob_order_approval', {
    p_order_id: orderId,
    p_expected_status: currentStatus,
    p_reason: reason,
    p_threshold: 0,
    p_is_escalated: true,
  });
  if (error) throw error;
}

async function confirmOrderWithinApproval({ orderId, currentStatus }: ApprovalTransitionInput): Promise<void> {
  const { error } = await supabase.rpc('confirm_sicoob_order', {
    p_order_id: orderId,
    p_expected_status: currentStatus,
  });
  if (error) throw error;
}

const approvalTransitionHandlers: Record<string, (input: ApprovalTransitionInput) => Promise<void>> = {
  waiting_approval: prepareOrderConfirmation,
  escalated_to_board: escalateOrderApproval,
  confirmed: confirmOrderWithinApproval,
};

async function executeApprovalStatusTransition(
  orderId: string,
  status: string,
  currentStatus: string,
  observations?: string,
): Promise<boolean> {
  if (status === 'rejected') {
    throw new Error('Use a decisão de rejeição para registrar o motivo e preservar a auditoria.');
  }

  const handler = approvalTransitionHandlers[status];
  if (!handler) return false;

  await handler({ orderId, currentStatus, observations });
  return true;
}

/**
 * Service for Sicoob Orders with authorization checks.
 * Note: RLS on the database is the primary security layer, 
 * but client-side checks provide better UX.
 */
export const sicoobOrderService = {
  async listOrders(filters?: { 
    search?: string, 
    status?: string, 
    statuses?: string[],
    pa_id?: string, 
    cooperative_id?: string,
    from?: string,
    to?: string,
    page?: number,
    pageSize?: number
  }): Promise<{ orders: SicoobOrder[], total: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    let query = supabase.from("sicoob_orders")
      .select("*, pa:postos_atendimento(nome), cooperativa:cooperativas(nome)", { count: "exact" });

    if (filters?.statuses?.length) {
      query = query.in("status", filters.statuses);
    } else if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters?.pa_id && filters.pa_id !== "all") {
      query = query.eq("pa_id", filters.pa_id);
    }
    if (filters?.cooperative_id && filters.cooperative_id !== "all") {
      query = query.eq("cooperative_id", filters.cooperative_id);
    }
    if (filters?.from) {
      query = query.gte("created_at", filters.from);
    }
    if (filters?.to) {
      query = query.lte("created_at", filters.to);
    }

    if (filters?.search) {
      const term = filters.search.toLowerCase().trim();
      // Em uma implementação enterprise real, usaríamos busca full-text ou um operador or complexo.
      // Aqui, aplicamos o filtro na query principal para campos suportados.
      query = query.or(`order_number.ilike.%${term}%,notes.ilike.%${term}%,tracking_code.ilike.%${term}%`);
    }

    const { data: profile } = await supabase.from("profiles").select("role, pa_id, cooperativa_id").eq("user_id", user.id).single();

    if (profile?.role === 'gestor_pa' && profile.pa_id) {
      query = query.eq("pa_id", profile.pa_id);
    } else if (profile?.role === 'gestor_singular' && profile.cooperativa_id) {
      query = query.eq("cooperative_id", profile.cooperativa_id);
    }

    // Paginação no servidor para performance máxima
    if (filters?.page && filters?.pageSize) {
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    
    return {
      orders: data as SicoobOrder[],
      total: count || 0
    };
  },

  async getOrderById(id: string): Promise<SicoobOrder> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("sicoob_orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as SicoobOrder;
  },


  async getOrderItems(orderId: string): Promise<SicoobOrderItem[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("sicoob_order_items")
      .select("*")
      .eq("order_id", orderId);
    if (error) throw error;
    return data as SicoobOrderItem[];
  },

  async getItemLogs(orderId: string): Promise<SicoobOrderItemLog[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("sicoob_order_item_logs")
      .select(`
        id,
        action,
        old_data,
        new_data,
        created_at,
        user:profiles!user_id(display_name)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as unknown as SicoobOrderItemLog[];
  },

  async updateOrderStatus(orderId: string, status: string, currentStatus?: string, observations?: string): Promise<void> {
    if (!currentStatus) {
      throw new Error("O status atual é obrigatório para evitar uma atualização concorrente.");
    }
    if (!canSicoobTransitionTo(currentStatus as OrderStatus, status as OrderStatus)) {
      throw new Error(`Transição de status inválida: de ${currentStatus} para ${status}`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const approvalTransitionExecuted = await executeApprovalStatusTransition(
      orderId,
      status,
      currentStatus,
      observations,
    );
    if (!approvalTransitionExecuted) {
      const { error } = await supabase.rpc('transition_sicoob_order_status', {
        p_order_id: orderId,
        p_expected_status: currentStatus,
        p_new_status: status,
        p_comment: observations || null,
      });
      if (error) throw error;
    }
  },

  async approveOrdersBulk(orderIds: string[]): Promise<{ successes: string[], failures: { id: string, reason: string }[] }> {
    const results = await Promise.allSettled(
      orderIds.map(async (id) => {
        const { data: order, error } = await supabase
          .from('sicoob_orders')
          .select('status')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!order) throw new Error('Pedido não encontrado ou fora do seu escopo.');
        await this.updateOrderStatus(id, 'confirmed', order.status);
        return id;
      })
    );

    const successes: string[] = [];
    const failures: { id: string, reason: string }[] = [];

    results.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successes.push(res.value);
      } else {
        failures.push({ id: orderIds[index]!, reason: res.reason?.message || "Erro desconhecido" });
      }
    });

    return { successes, failures };
  },

  async reorderOrder(orderId: string, suppliedKey?: string): Promise<string> {
    const intent = `order:${orderId}`;
    const { idempotencyKey, managed } = beginReorderIntent(intent, suppliedKey);
    const { data, error } = await supabase.functions.invoke('sicoob-reorder', {
      body: { orderId, idempotencyKey },
    });
    if (error) throw error;
    const newQuoteId = typeof data?.quoteId === 'string' ? data.quoteId : null;
    if (!newQuoteId) throw new Error('A recompra não retornou o orçamento criado.');
    completeReorderIntent(intent, idempotencyKey, managed);
    return newQuoteId;
  },

  async revalidateReorderQuote(quoteId: string): Promise<{
    catalogValidUntil: string | null;
    priceChangedItems: number;
    stockIsReserved: false;
  }> {
    const { data, error } = await supabase.functions.invoke('sicoob-reorder', {
      body: { revalidateQuoteId: quoteId },
    });
    if (error) {
      if (typeof data?.error === 'string') throw new Error(data.error);
      throw error;
    }
    if (data?.quoteId !== quoteId || data?.stockIsReserved !== false) {
      throw new Error('O servidor não confirmou a revalidação segura da recompra.');
    }
    return {
      catalogValidUntil: typeof data.catalogValidUntil === 'string' ? data.catalogValidUntil : null,
      priceChangedItems: Number(data.priceChangedItems ?? 0),
      stockIsReserved: false,
    };
  },

  async duplicateSicoobOrder(orderId: string): Promise<string> {
    return this.reorderOrder(orderId);
  }
};
