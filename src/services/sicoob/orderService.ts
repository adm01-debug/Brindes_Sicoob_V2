import { supabase } from "@/integrations/supabase/client";
import {
  canSicoobTransitionTo,
  type OrderStatus,
  type SicoobOrder,
  type SicoobOrderItem,
  type SicoobOrderItemLog,
} from "@/types/sicoob/orders";
import { fetchPromobrindProductById, getProductPrice } from "@/lib/external-db";

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

    if (filters?.status && filters.status !== "all") {
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

    const { data: profile } = await supabase.from("profiles").select("role, pa_id, cooperativa_id").eq("id", user.id).single();

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

  async updateOrderTotal(orderId: string, total: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { error } = await supabase
      .from("sicoob_orders")
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
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
        failures.push({ id: orderIds[index], reason: res.reason?.message || "Erro desconhecido" });
      }
    });

    return { successes, failures };
  },

  async reorderOrder(orderId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const order = await this.getOrderById(orderId);
    const items = await this.getOrderItems(orderId);

    if (items.length === 0) {
      throw new Error('O pedido original não possui itens para recompra.');
    }

    // Recompra não reutiliza preço ou disponibilidade histórica. Cada produto é
    // consultado no catálogo externo antes de qualquer orçamento ser criado.
    const currentItems = await Promise.all(items.map(async (item) => {
      if (!item.product_id) {
        throw new Error(`O item “${item.product_name}” não possui produto vinculado para validar a recompra.`);
      }

      const product = await fetchPromobrindProductById(item.product_id);
      if (!product || product.is_active === false || product.active === false) {
        throw new Error(`O produto “${item.product_name}” não está mais disponível no catálogo.`);
      }

      const currentPrice = getProductPrice(product);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        throw new Error(`O produto “${item.product_name}” está sem preço vigente para recompra.`);
      }

      if (product.stock_quantity === null || product.stock_quantity === undefined || product.stock_quantity < item.quantity) {
        throw new Error(`Estoque insuficiente para “${item.product_name}”. Consulte outra opção ou reduza a quantidade.`);
      }

      return {
        product_id: product.id,
        product_sku: product.sku,
        product_name: product.name,
        product_image_url: product.primary_image_url || product.image_url,
        quantity: item.quantity,
        unit_price: currentPrice,
        subtotal: currentPrice * item.quantity,
        price_confirmed_at: new Date().toISOString(),
      };
    }));

    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
    const subtotal = currentItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Cria o rascunho apenas após revalidar todos os itens. O novo orçamento
    // mantém a trilha da origem, mas usa os valores vigentes do catálogo.
    const { data: newQuote, error: qErr } = await supabase.from("quotes").insert({
      client_id: order.pa_id,
      client_name: order.pa?.nome || order.pa_id,
      status: 'draft',
      notes: `Recompra do pedido Sicoob #${order.order_number || order.id.slice(0, 8)}. Preço e estoque revalidados em ${new Date().toLocaleString('pt-BR')}.`,
      singular_id: order.cooperative_id,
      organization_id: profile?.organization_id || order.pa_id,
      seller_id: user.id,
      total: subtotal,
      subtotal,
    }).select("id").single();

    if (qErr) throw qErr;

    if (currentItems.length > 0) {
      const quoteItems = currentItems.map(it => ({
        quote_id: newQuote.id,
        ...it,
      }));
      const { error: iErr } = await supabase.from("quote_items").insert(quoteItems);
      if (iErr) {
        await supabase.from('quotes').delete().eq('id', newQuote.id);
        throw iErr;
      }
    }

    return newQuote.id;
  },

  async duplicateSicoobOrder(orderId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const order = await this.getOrderById(orderId);
    const items = await this.getOrderItems(orderId);

    const { data: newOrder, error: oErr } = await supabase.from("sicoob_orders").insert({
      pa_id: order.pa_id,
      cooperative_id: order.cooperative_id,
      status: 'draft',
      notes: `Duplicado do pedido #${order.order_number || order.id.slice(0, 8)}`,
      total_amount: order.total_amount,
      created_by: user.id
    }).select("id").single();

    if (oErr) throw oErr;

    if (items.length > 0) {
      const orderItems = items.map(it => ({
        order_id: newOrder.id,
        product_id: it.product_id,
        product_sku: it.product_sku,
        product_name: it.product_name,
        product_image_url: it.product_image_url,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));
      const { error: iErr } = await supabase.from("sicoob_order_items").insert(orderItems);
      if (iErr) throw iErr;
    }

    return newOrder.id;
  }
};
