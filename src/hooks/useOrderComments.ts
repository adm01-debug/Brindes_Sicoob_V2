import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface OrderComment {
  id: string;
  order_id: string;
  author_id: string;
  author_role: string;
  content: string;
  attachments: any;
  is_internal: boolean;
  created_at: string;
}

export function useOrderComments(orderId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: comments, isLoading } = useQuery({
    queryKey: ["order_comments", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_comments")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as OrderComment[];
    },
    enabled: !!orderId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, isInternal = false, attachments = null }: { content: string; isInternal?: boolean; attachments?: any }) => {
      const { error } = await supabase.from("order_comments").insert({
        order_id: orderId,
        author_id: user?.id,
        author_role: (user as any)?.role || 'user',
        content,
        is_internal: isInternal,
        attachments
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order_comments", orderId] });
      toast.success("Comentário enviado");
    },
  });

  return {
    comments,
    isLoading,
    addComment,
  };
}
