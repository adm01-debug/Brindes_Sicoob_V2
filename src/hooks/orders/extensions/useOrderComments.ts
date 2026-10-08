import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OrderService } from "@/services/OrderService";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { requireOrderId } from "@/hooks/orders/require-order-id";

export const useOrderComments = (orderId?: string, filters?: { search?: string }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["order-comments", orderId, filters, page],
    queryFn: () => OrderService.listComments(requireOrderId(orderId), { ...filters, page, pageSize }),
    enabled: !!orderId,
  });

  const addComment = useMutation({
    mutationFn: async ({ content, isInternal = false, attachments = null }: { content: string, isInternal?: boolean, attachments?: Json | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      return OrderService.addComment(requireOrderId(orderId), user.id, content, isInternal, attachments);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-comments", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-audit", orderId] });
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
