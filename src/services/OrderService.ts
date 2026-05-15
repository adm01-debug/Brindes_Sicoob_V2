import { supabase } from "@/integrations/supabase/client";
import { OrderRow, OrderFilters, OrderItem, OrderStatus, OrderLogistics, OrderInvoice, OrderComment } from "@/types/orders";
import { ORDER_STATUS_LABELS } from "@/constants/orders";

export class OrderService {
  static async list(sellerId: string, scope: string, filters?: OrderFilters): Promise<OrderRow[]> {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    
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
      q = q.or(`order_number.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,client_company.ilike.%${filters.search}%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as OrderRow[];
  }

  static async getById(orderId: string) {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
    ]);
    
    if (orderRes.error) throw orderRes.error;
    if (itemsRes.error) throw itemsRes.error;
    
    return {
      order: orderRes.data as OrderRow | null,
      items: itemsRes.data as OrderItem[],
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

  static async addInvoice(orderId: string, values: Partial<OrderInvoice>) {
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

  static async addComment(orderId: string, authorId: string, content: string, isInternal = false, attachments = null) {
    const { data, error } = await supabase
      .from("order_comments")
      .insert({
        order_id: orderId,
        author_id: authorId,
        content,
        is_internal: isInternal,
        attachments
      })
      .select()
      .single();
    if (error) throw error;
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
      
      await supabase.functions.invoke('send-transactional-email', {
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
    const { order: original, items } = await this.getById(orderId);
    if (!original) throw new Error("Order not found");

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

    if (items?.length) {
      const newItems = items.map(it => ({
        ...it,
        order_id: newOrder.id,
      }));
      await supabase.from("order_items").insert(newItems);
    }

    return newOrder as OrderRow;
  }
}
