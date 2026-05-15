import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrderService } from "@/services/OrderService";

export const useOrderLogistics = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: logistics, isLoading } = useQuery({
    queryKey: ["order-logistics", orderId],
    queryFn: () => OrderService.getLogistics(orderId!),
    enabled: !!orderId,
  });

  const updateLogistics = useMutation({
    mutationFn: (values: any) => OrderService.upsertLogistics(orderId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-logistics", orderId] });
      queryClient.invalidateQueries({ queryKey: ["logistics-tracking", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Logística atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar logística: " + error.message);
    },
    onSettled: () => {
      // Invalidate the order data as well since logistics updates might affect fulfillment status
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return { logistics, isLoading, updateLogistics };
};

export const useOrderInvoices = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["order-invoices", orderId],
    queryFn: () => OrderService.listInvoices(orderId!),
    enabled: !!orderId,
  });

  const addInvoice = useMutation({
    mutationFn: (values: any) => OrderService.addInvoice(orderId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-invoices", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      toast.success("Nota fiscal adicionada");
    },
  });

  const uploadFile = async (file: File, path: string) => {
    const allowedTypes = ['application/pdf', 'text/xml', 'application/xml'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xml')) {
      throw new Error("Tipo de arquivo não permitido. Apenas PDF e XML.");
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new Error("Arquivo muito grande. Máximo 10MB.");

    const fileName = `${orderId}/${path}`;
    
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('order-documents')
        .list(`${orderId}`);
      
      if (listError) throw listError;

      const isDuplicate = existingFiles?.some(f => f.name === path);
      if (isDuplicate) {
        throw new Error("Arquivo já existe. Por favor, renomeie o arquivo ou remova o anterior.");
      }

      const { data, error } = await supabase.storage
        .from('order-documents')
        .upload(fileName, file, {
          upsert: false,
          cacheControl: '3600'
        });
      
      if (error) {
        if (error.message.includes('already exists')) {
          throw new Error("Arquivo já existe no servidor.");
        }
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('order-documents')
        .getPublicUrl(data.path);
        
      return publicUrl;
    } catch (err: any) {
      console.error("Upload error:", err);
      throw err;
    }
  };

  return { invoices, isLoading, addInvoice, uploadFile };
};

export const useOrderPayments = (orderId?: string) => {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["order-payments", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_payments")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return { payments, isLoading };
};

export const useOrderPilotApprovals = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["order-pilot-approvals", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_pilot_approvals")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const updateApprovalStatus = useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string, status: string, feedback?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("order_pilot_approvals")
        .update({ status, feedback, approved_at: status === 'approved' ? new Date().toISOString() : null })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Log audit for pilot status change
      await OrderService.logAudit({
        orderId: data.order_id,
        eventType: 'pilot_update',
        description: `Status do piloto alterado para: ${status === 'approved' ? 'Aprovado' : 'Reprovado'}`,
        metadata: { status, feedback },
        createdByName: user.email
      });

      return data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate both local pilot data and the order details
      queryClient.invalidateQueries({ queryKey: ["order-pilot-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status do piloto atualizado");
    },
  });

  return { approvals, isLoading, updateApprovalStatus };
};

export const useOrderAudit = (orderId?: string, filters?: { event_type?: string, startDate?: string, endDate?: string, search?: string, role?: string }) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["order-audit", orderId, filters, page],
    queryFn: async () => {
      let query = supabase
        .from("order_audit_events")
        .select("*", { count: 'exact' })
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });

      if (filters?.event_type && filters.event_type !== 'all') {
        query = query.eq("event_type", filters.event_type);
      }
      if (filters?.role && filters.role !== 'all') {
        query = query.eq("actor_role", filters.role);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }
      if (filters?.search) {
        query = query.ilike("description", `%${filters.search}%`);
      }

      const { data: auditData, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { events: auditData, count };
    },
    enabled: !!orderId,
  });

  return { 
    auditEvents: data?.events, 
    totalCount: data?.count,
    isLoading,
    page,
    setPage,
    pageSize
  };
};

export const useOrderComments = (orderId?: string, filters?: { search?: string }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["order-comments", orderId, filters, page],
    queryFn: () => OrderService.listComments(orderId!, { ...filters, page, pageSize }),
    enabled: !!orderId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, isInternal = false, attachments = null }: { content: string, isInternal?: boolean, attachments?: any[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      return OrderService.addComment(orderId!, user.id, content, isInternal, attachments);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["order-comments", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
      
      // Auto-invalidation if multiple tabs/windows are open (optional but professional)
      // queryClient.setQueryData(["order-comments", orderId, filters, page], (old: any) => ({
      //   ...old,
      //   comments: [data, ...(old?.comments || [])]
      // }));
      
      toast.success("Comentário enviado");
    },
    onError: (err: Error) => {
      console.error("Error adding comment:", err);
      toast.error(err.message || "Erro ao enviar comentário");
    }
  });

  return { 
    comments: data?.comments, 
    totalCount: data?.count,
    isLoading, 
    addComment,
    page,
    setPage,
    pageSize
  };
};

export const useOrderTemplates = (orderId?: string) => {
  const { data: templates, isLoading } = useQuery({
    queryKey: ["order-templates", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_templates")
        .select(`
          *,
          items:order_template_items(*)
        `);
      if (error) throw error;
      return data;
    },
  });

  return { templates, isLoading };
};

export const useOrdersReport = (filters?: any) => {
  return useQuery({
    queryKey: ["orders-report", filters],
    queryFn: async () => {
      return {
        total_orders: 150,
        total_amount: 450000,
        average_ticket: 3000,
        by_status: {
          pending: 25,
          shipped: 40,
          completed: 85
        }
      };
    }
  });
};

export const useLogisticsTracking = (orderId?: string) => {
  return useQuery({
    queryKey: ["logistics-tracking", orderId],
    queryFn: () => OrderService.getLogistics(orderId!),
    enabled: !!orderId
  });
};
