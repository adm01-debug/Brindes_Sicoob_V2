import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useOrderLogistics = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: logistics, isLoading } = useQuery({
    queryKey: ["order-logistics", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logistics")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const updateLogistics = useMutation({
    mutationFn: async (values: any) => {
      if (logistics?.id) {
        const { data, error } = await supabase
          .from("order_logistics")
          .update(values)
          .eq("id", logistics.id)
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-logistics", orderId] });
      toast.success("Logística atualizada com sucesso");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar logística: " + error.message);
    },
  });

  return { logistics, isLoading, updateLogistics };
};

export const useOrderInvoices = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["order-invoices", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_invoices")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const addInvoice = useMutation({
    mutationFn: async (values: any) => {
      const { data, error } = await supabase
        .from("order_invoices")
        .insert({ order_id: orderId, ...values })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-invoices", orderId] });
      toast.success("Nota fiscal adicionada");
    },
  });

  const uploadFile = async (file: File, path: string) => {
    // Validação de tipo (PDF e XML)
    const allowedTypes = ['application/pdf', 'text/xml', 'application/xml'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xml')) {
      throw new Error("Tipo de arquivo não permitido. Apenas PDF e XML.");
    }

    // Validação de tamanho (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new Error("Arquivo muito grande. Máximo 10MB.");

    const fileName = `${orderId}/${path}`;
    
    // Tratamento de duplicidade: Listar arquivos na pasta do pedido
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('order-documents')
      .list(`${orderId}`);
    
    if (listError) {
      console.error("Erro ao verificar duplicidade:", listError);
    }

    const isDuplicate = existingFiles?.some(f => f.name === path);
    if (isDuplicate) {
      // Se for duplicado, avisamos via erro ou poderíamos renomear. 
      // O requisito pede tratamento de duplicidade.
      throw new Error("Arquivo já existe. Por favor, renomeie o arquivo ou remova o anterior.");
    }

    const { data, error } = await supabase.storage
      .from('order-documents')
      .upload(fileName, file, {
        upsert: false, // Garantir que não sobrescreve sem intenção
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
      const { data, error } = await supabase
        .from("order_pilot_approvals")
        .update({ status, feedback, approved_at: status === 'approved' ? new Date().toISOString() : null })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-pilot-approvals", orderId] });
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
    queryFn: async () => {
      let query = supabase
        .from("order_comments")
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `, { count: 'exact' })
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });

      if (filters?.search) {
        query = query.ilike("content", `%${filters.search}%`);
      }

      const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { comments: data, count };
    },
    enabled: !!orderId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, isInternal = false, attachments = null }: { content: string, isInternal?: boolean, attachments?: any[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("order_comments")
        .insert({
          order_id: orderId,
          user_id: user.id,
          content,
          is_internal: isInternal,
          attachments
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-comments", orderId] });
      toast.success("Comentário enviado");
    },
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
      // Mock report data for now
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_logistics")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });
};
