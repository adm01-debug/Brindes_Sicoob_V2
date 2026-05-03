import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface OrderComment {
  id: string;
  order_id: string;
  user_id: string;
  author_id?: string; // Compatibility
  author_role: string;
  content: string;
  attachments: any;
  is_internal: boolean;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url: string;
  };
}

export function useOrderComments(orderId: string, filters?: { search?: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["order_comments", orderId, filters, page],
    queryFn: async () => {
      let query = supabase
        .from("order_comments")
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `, { count: 'exact' })
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (filters?.search) {
        query = query.ilike("content", `%${filters.search}%`);
      }

      const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { 
        comments: (data ?? []).reverse() as OrderComment[], 
        count 
      };
    },
    enabled: !!orderId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`order_comments:${orderId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_comments', 
        filter: `order_id=eq.${orderId}` 
      }, () => {
        qc.invalidateQueries({ queryKey: ["order_comments", orderId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, qc]);

  const addComment = useMutation({
    mutationFn: async ({ content, isInternal = false, attachments = null }: { content: string; isInternal?: boolean; attachments?: any }) => {
      const { error } = await supabase.from("order_comments").insert({
        order_id: orderId,
        user_id: user?.id,
        author_id: user?.id,
        author_role: (user as any)?.role || 'user',
        content,
        is_internal: isInternal,
        attachments
      });
      if (error) throw error;

      // Log audit event
      await supabase.rpc('log_order_audit_event', {
        p_order_id: orderId,
        p_event_type: 'comment',
        p_description: isInternal ? "Nota interna adicionada" : "Comentário adicionado",
        p_observations: content.slice(0, 100),
        p_created_by_name: user?.email
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_comments", orderId] });
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
}
