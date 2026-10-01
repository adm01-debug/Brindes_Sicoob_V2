import { supabase } from "@/integrations/supabase/client";
import { OrderRow, OrderFilters, OrderItem, OrderStatus, OrderLogistics, OrderInvoice, OrderComment } from "@/types/orders";
import { ORDER_STATUS_LABELS } from "@/constants/orders";
import { logger } from "@/lib/logger";
import { invokeEdgeFunction } from "@/lib/edge-function-client";

export interface ConvertQuoteToOrderParams {
  quoteId: string;
  sellerId: string;
  organizationId?: string | null;
}

export interface ConvertedOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
}

export class OrderService {
  static async list(sellerId: string, scope: string, filters?: OrderFilters & { page?: number; pageSize?: number }): Promise<{ data: OrderRow[]; count: number | null }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    
    let q = supabase
      // rls-allow: scope self aplicado abaixo no mesmo builder; demais papéis dependem de RLS
      .from("orders")
      .select("*", { count: 'exact' })
      .order("created_at", { ascending: false });
    
    if (scope === "self" && sellerId) q = q.eq("seller_id", sellerId);
    
    if (filters?.status && filters.status !== "all") {
      q = q.eq("status", filters.status);
    }
    
    if (filters?.clientCompany) {
      q = q.ilike("client_company", `%${filters.clientCompany}%`);
    }
    
    if (filters?.startDate) q = q.gte("created_at", filters.startDate);
    if (filters?.endDate) q = q.lte("created_at", filters.endDate);
    
    if (filters?.search) {
      // Improved multi-column search
      const search = filters.search.trim();
      q = q.or(`order_number.ilike.%${search}%,client_name.ilike.%${search}%,client_company.ilike.%${search}%`);
    }

    try {
      const { data, error, count } = await q.range((page - 1) * pageSize, page * pageSize - 1);
      if (error) {
        logger.error("Error listing orders:", error);
        throw error;
      }
      return { data: (data ?? []) as OrderRow[], count };
    } catch (err) {
      logger.error("Unexpected error in OrderService.list:", err);
      throw err;
    }
  }

  static async getById(orderId: string) {
    if (!orderId) return null;
    // rls-allow: lookup por id; RLS valida ownership e organização
    const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return null;

    const { data: items, error: itemsError } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    if (itemsError) throw itemsError;
    
    return {
      order: order as OrderRow,
      items: items as OrderItem[],
    };
  }

  static async update(orderId: string, patch: Partial<OrderRow>) {
    const { error } = await supabase
      // rls-allow: atualização por id; RLS valida ownership e organização
      .from("orders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", orderId);
      
    if (error) throw error;
  }

  // Logistics Methods
  static async getLogistics(orderId: string) {
    const { data, error } = await supabase
      .from("order_logistics")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: order, error: orderError } = await supabase
      // rls-allow: lookup por UUID para compor logística; a RLS valida ownership/organização.
      .from("orders")
      .select("shipping_type")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;

    return {
      id: data.id,
      order_id: data.order_id,
      tracking_number: data.tracking_code,
      carrier: data.carrier_name,
      shipping_type: order?.shipping_type ?? null,
      estimated_delivery: data.estimated_delivery,
      actual_delivery: data.actual_delivery,
      status: data.delivery_status,
      created_at: data.created_at ?? new Date(0).toISOString(),
      updated_at: data.updated_at ?? new Date(0).toISOString(),
    } satisfies OrderLogistics;
  }

  static async upsertLogistics(orderId: string, values: Partial<OrderLogistics>) {
    const existing = await this.getLogistics(orderId);
    const logisticsValues = {
      ...(values.tracking_number !== undefined && { tracking_code: values.tracking_number }),
      ...(values.carrier !== undefined && { carrier_name: values.carrier }),
      ...(values.estimated_delivery !== undefined && { estimated_delivery: values.estimated_delivery }),
      ...(values.actual_delivery !== undefined && { actual_delivery: values.actual_delivery }),
      ...(values.status !== undefined && { delivery_status: values.status }),
    };
    let saved;
    if (existing) {
      const { data, error } = await supabase
        .from("order_logistics")
        .update(logisticsValues)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("order_logistics")
        .insert({ order_id: orderId, ...logisticsValues })
        .select()
        .single();
      if (error) throw error;
      saved = data;
    }

    if (values.shipping_type !== undefined) {
      await this.update(orderId, { shipping_type: values.shipping_type });
    }
    return saved;
  }

  // Invoices Methods
  static async listInvoices(orderId: string) {
    const { data, error } = await supabase
      .from("order_invoices")
      .select("*")
      .eq("order_id", orderId);
    if (error) throw error;
    return data as OrderInvoice[];
  }

  static async addInvoice(orderId: string, values: Partial<OrderInvoice> & Pick<OrderInvoice, "invoice_number" | "amount">) {
    const { data, error } = await supabase
      .from("order_invoices")
      .insert({ order_id: orderId, ...values })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Comments Methods
  static async listComments(orderId: string, filters?: { search?: string, page?: number, pageSize?: number }) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 15;
    
    let query = supabase
      .from("order_comments")
      .select(`
        *,
        author:profiles!order_comments_author_id_fkey(full_name, avatar_url)
      `, { count: 'exact' })
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (filters?.search) {
      query = query.ilike("content", `%${filters.search}%`);
    }

    const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw error;
    return { comments: data as any[], count };
  }

  static async addComment(orderId: string, authorId: string, content: string, isInternal = false, attachments: any = null) {
    if (!content?.trim()) throw new Error("Conteúdo do comentário é obrigatório");

    const { data, error } = await supabase
      .from("order_comments")
      .insert({
        order_id: orderId,
        author_id: authorId,
        content: content.trim(),
        is_internal: isInternal,
        attachments
      })
      .select()
      .single();
    if (error) {
      logger.error("Error adding order comment:", error);
      throw error;
    }
    return data;
  }

  static async logAudit(params: {
    orderId: string;
    eventType: string;
    description: string;
    metadata: any;
    createdByName?: string;
  }) {
    const { error } = await supabase.rpc('log_order_audit_event', {
      p_order_id: params.orderId,
      p_event_type: params.eventType,
      p_description: params.description,
      p_metadata: params.metadata,
      p_created_by_name: params.createdByName
    });
    if (error) throw error;
  }

  static async listAuditEvents(orderId: string, filters?: { event_type?: string, search?: string }) {
    let query = supabase
      .from('order_audit_events')
      .select('*, created_at:occurred_at')
      .eq('order_id', orderId)
      .order('occurred_at', { ascending: false });

    if (filters?.event_type && filters.event_type !== 'all') {
      query = query.eq('event_type', filters.event_type);
    }

    if (filters?.search) {
      query = query.ilike('description', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Pilot Approvals Methods
  static async listPilotApprovals(orderId: string) {
    const { data, error } = await supabase
      .from("order_pilot_approvals")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async createPilotApproval(payload: any) {
    const { data, error } = await supabase
      .from("order_pilot_approvals")
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updatePilotApprovalStatus(id: string, payload: any) {
    const { error } = await supabase
      .from("order_pilot_approvals")
      .update(payload)
      .eq("id", id);
    
    if (error) throw error;
  }

  static async uploadPilotPhoto(orderId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}/${Math.random()}.${fileExt}`;
    const filePath = `pilots/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('personalization-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('personalization-images')
      .getPublicUrl(filePath);
      
    return publicUrl;
  }

  // Order Templates Methods
  static async listTemplates() {
    const { data, error } = await supabase
      .from("order_templates")
      .select("*, items:order_template_items(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  static async deleteTemplate(id: string) {
    const { error } = await supabase.from("order_templates").delete().eq("id", id);
    if (error) throw error;
  }

  static async getApprovalHistory(orderId: string) {
    const { data, error } = await supabase
      .from("order_approval_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // approver_id referencia auth.users(id), sem FK para profiles — o PostgREST
    // não consegue embutir `approver:approver_id(...)`. Busca-se profiles à parte.
    const approverIds = Array.from(
      new Set((data ?? []).map((h) => h.approver_id).filter((id): id is string => !!id))
    );
    const approverMap = new Map<string, { full_name: string | null }>();
    if (approverIds.length > 0) {
      const { data: approvers } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", approverIds);
      for (const a of approvers ?? []) {
        approverMap.set(a.user_id, { full_name: a.full_name });
      }
    }

    return (data ?? []).map((h) => ({
      ...h,
      approver: h.approver_id ? approverMap.get(h.approver_id) ?? null : null,
    }));
  }

  static async getSmartAlerts() {
    const { data: pending } = await supabase
      // rls-allow: alerta administrativo; RLS aplica papel e organização
      .from("orders")
      .select("id, created_at")
      .eq("status", "enviado_gestor");
    
    return pending || [];
  }






  static async notifyStatusChange(params: {
    orderId: string;
    userId: string;
    userEmail: string;
    newStatus: OrderStatus;
    oldStatus: string;
    notes?: string;
  }) {
    const statusLabel = ORDER_STATUS_LABELS[params.newStatus];
    
    await supabase.from('notifications').insert({
      user_id: params.userId,
      title: "Status do Pedido Atualizado",
      message: `O pedido #${params.orderId.slice(0, 8)} mudou para ${statusLabel}`,
      type: 'info',
      category: 'status',
      source_system: 'compras',
      source_entity_type: 'order',
      source_entity_id: params.orderId,
      action_url: `/pedidos/${params.orderId}`
    });

    try {
      // Safe origin detection for both browser and SSR/Deno
      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.APP_URL || '');
      
      await invokeEdgeFunction('send-transactional-email', {
        body: {
          event_type: 'sicoob_order_status_change',
          recipient_email: params.userEmail,
          recipient_name: params.userEmail.split('@')[0],
          data: {
            order_number: params.orderId.slice(0, 8),
            new_status: statusLabel,
            notes: params.notes,
            action_url: `${origin}/pedidos/${params.orderId}`
          }
        }
      });
    } catch (e) {
      console.error('Email notification failed:', e);
    }
  }

  static async duplicate(
    orderId: string,
    idempotencyKey: string = crypto.randomUUID(),
  ): Promise<OrderRow> {
    const { data, error } = await supabase.rpc("duplicate_order_atomic", {
      p_order_id: orderId,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;

    const duplicated = Array.isArray(data) ? data[0] : data;
    if (!duplicated?.id || !duplicated?.order_number) {
      throw new Error("O banco não confirmou a duplicação integral do pedido");
    }
    return duplicated as OrderRow;
  }

  static async convertQuoteToOrder({ quoteId }: ConvertQuoteToOrderParams): Promise<ConvertedOrder> {
    try {
      const { data, error } = await supabase.rpc("convert_quote_to_sicoob_order", {
        p_quote_id: quoteId,
      });
      if (error) throw error;

      const order = Array.isArray(data) ? data[0] : data;
      if (!order?.id || !order?.order_number) {
        throw new Error("O banco não confirmou a criação do pedido Sicoob");
      }
      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total: Number(order.total_amount ?? 0),
      };
    } catch (error: any) {
      logger.error("Error converting quote to order:", error);
      throw error;
    }
  }
}
