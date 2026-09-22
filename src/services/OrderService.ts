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
    return data as OrderLogistics | null;
  }

  static async upsertLogistics(orderId: string, values: Partial<OrderLogistics>) {
    const existing = await this.getLogistics(orderId);
    if (existing) {
      const { data, error } = await supabase
        .from("order_logistics")
        .update(values)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from("order_logistics")
        .insert({ order_id: orderId, ...values })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
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
    await supabase.rpc('log_order_audit_event', {
      p_order_id: params.orderId,
      p_event_type: params.eventType,
      p_description: params.description,
      p_metadata: params.metadata,
      p_created_by_name: params.createdByName
    });
  }

  static async listAuditEvents(orderId: string, filters?: { event_type?: string, search?: string }) {
    let query = supabase
      .from('order_audit_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

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
      .select(`
        *,
        approver:approver_id(full_name)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }

  static async getSmartAlerts() {
    const { data: pending } = await supabase
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

  static async duplicate(orderId: string, sellerId: string): Promise<OrderRow> {
    const result = await this.getById(orderId);
    if (!result) throw new Error("Pedido não encontrado");
    const { order: original, items } = result;

    // Copy logistics if exists
    const logistics = await this.getLogistics(orderId);

    const newOrderNumber = `RE-${original.order_number.replace('PED-', '')}-${Math.floor(Math.random() * 1000)}`;
    
    const { data: newOrder, error: insErr } = await supabase
      .from("orders")
      .insert({
        ...original,
        id: undefined,
        order_number: newOrderNumber,
        status: "rascunho",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        seller_id: sellerId
      })
      .select()
      .single();

    if (insErr) throw insErr;

    // Deep copy items
    if (items?.length) {
      const newItems = items.map(it => ({
        ...it,
        id: undefined, // Ensure new IDs
        order_id: newOrder.id,
      }));
      await supabase.from("order_items").insert(newItems);
    }

    // Deep copy logistics
    if (logistics) {
      await supabase.from("order_logistics").insert({
        ...logistics,
        id: undefined,
        order_id: newOrder.id,
        tracking_code: null, // Reset tracking on duplication
        status: 'pending'
      });
    }

    // Log the event
    await this.logAudit({
      orderId: newOrder.id,
      eventType: 'ORDER_DUPLICATED',
      description: `Pedido duplicado a partir do pedido #${original.order_number}`,
      metadata: { originalOrderId: orderId }
    });

    return newOrder as OrderRow;
  }

  static async convertQuoteToOrder({ quoteId, sellerId, organizationId }: ConvertQuoteToOrderParams): Promise<ConvertedOrder> {
    try {
      // 1. Fetch the quote
      const { data: quote, error: qErr } = await supabase
        .from("quotes")
        .select("*, items:quote_items(*)")
        .eq("id", quoteId)
        .maybeSingle();
      
      if (qErr) throw qErr;
      if (!quote) throw new Error("Orçamento não encontrado");

      const validStatuses = ["approved", "approved_singular"];
      if (!validStatuses.includes(quote.status)) {
        throw new Error("Apenas orçamentos aprovados pela Singular podem ser oficializados");
      }

      // 2. Check if items have price/stock
      if (!quote.items?.length) {
        throw new Error("O orçamento não possui itens para oficialização");
      }

      const hasIncompleteItems = quote.items.some((i: any) => !i.unit_price || i.unit_price <= 0);
      if (hasIncompleteItems) {
        throw new Error("Existem itens com preço zerado ou inválido. Por favor, revise o orçamento.");
      }

      // 3. Check if order already exists
      const { data: existingOrder, error: eErr } = await supabase
        .from("orders")
        .select("id, order_number")
        .eq("quote_id", quoteId)
        .maybeSingle();
      
      if (eErr) throw eErr;
      if (existingOrder) {
        throw new Error(`Este orçamento já foi convertido no pedido #${existingOrder.order_number}`);
      }

      // 4. Create the order
      const effectiveOrgId = organizationId || quote.organization_id || null;
      const { data: order, error: insErr } = await supabase
        .from("orders")
        .insert({
          seller_id: sellerId,
          organization_id: effectiveOrgId,
          quote_id: quoteId,
          client_id: quote.client_id,
          client_name: quote.client_name,
          client_email: quote.client_email,
          client_phone: quote.client_phone,
          client_company: quote.client_company,
          subtotal: quote.subtotal,
          discount_amount: quote.discount_amount,
          shipping_cost: quote.shipping_cost || 0,
          shipping_type: quote.shipping_type,
          total: quote.total,
          payment_terms: quote.payment_terms,
          delivery_time: quote.delivery_time,
          notes: quote.notes,
          internal_notes: quote.internal_notes,
          status: "confirmed",
          fulfillment_status: "unfulfilled",
        })
        .select("id, order_number, status, total")
        .single();

      if (insErr) throw insErr;

      // 5. Copy items
      const orderItems = quote.items.map((item: any) => ({
        order_id: order.id,
        organization_id: effectiveOrgId,
        product_id: item.product_id,
        product_sku: item.product_sku,
        product_name: item.product_name,
        product_image_url: item.product_image_url,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { error: itemInsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemInsErr) throw itemInsErr;

      // 6. Update quote status
      const { error: updErr } = await supabase
        .from("quotes")
        .update({ status: "converted" })
        .eq("id", quoteId);
      
      if (updErr) throw updErr;

      return { ...order, total: order.total ?? 0 };
    } catch (error: any) {
      logger.error("Error converting quote to order:", error);
      throw error;
    }
  }
}