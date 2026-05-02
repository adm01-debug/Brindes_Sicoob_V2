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
    // Validação de tipo e tamanho (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new Error("Arquivo muito grande. Máximo 10MB.");

    const fileName = `${orderId}/${path}`;
    
    // Verificar se já existe (simulando tratamento de duplicidade)
    const { data: existing } = await supabase.storage
      .from('order-documents')
      .list(orderId);
    
    if (existing?.some(f => f.name === path)) {
      // Opcional: toast informativo ou renomear. Por agora, sobrescrevemos ou avisamos.
      console.log("Arquivo duplicado detectado, sobrescrevendo...");
    }

    const { data, error } = await supabase.storage
      .from('order-documents')
      .upload(fileName, file, {
        upsert: true,
        cacheControl: '3600'
      });
    
    if (error) throw error;
    
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

export const useOrderAudit = (orderId?: string) => {
  const { data: auditEvents, isLoading } = useQuery({
    queryKey: ["order-audit", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_audit_events")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  return { auditEvents, isLoading };
};

export const useOrderComments = (orderId?: string) => {
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["order-comments", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_comments")
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, isInternal = false }: { content: string, isInternal?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("order_comments")
        .insert({
          order_id: orderId,
          user_id: user.id,
          content,
          is_internal: isInternal
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-comments", orderId] });
    },
  });

  return { comments, isLoading, addComment };
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
