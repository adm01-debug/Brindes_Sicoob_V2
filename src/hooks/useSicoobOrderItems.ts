import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useSicoobOrderItems(orderId?: string) {
  const queryClient = useQueryClient();
  const { isVendedorRole, isAdmin } = useAuth();


  const addItem = useMutation({
    mutationFn: async ({
      productId,
      productName,
      quantity,
      unitPrice,
    }: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }) => {
      if (!isVendedorRole && !isAdmin) {
        throw new Error("Apenas vendedores ou administradores podem adicionar itens.");
      }
      if (!orderId) throw new Error("Order ID is required");

      const { data, error } = await supabase.rpc("mutate_sicoob_order_item", {
        p_order_id: orderId,
        p_action: "add",
        p_item_id: null,
        p_product_id: productId,
        p_product_name: productName,
        p_quantity: quantity,
        p_unit_price: unitPrice,
      });
      if (error) throw error;
      return Number(data);
    },
    onSuccess: () => {
      toast.success("Item adicionado com sucesso", {
        description: "O total do pedido foi recalculado automaticamente."
      });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_item_logs", orderId] });
    },
    onError: (error: any) => {
      console.error("Error adding item:", error);
      const message = error.message || "Erro desconhecido ao processar sua solicitação.";
      toast.error("Não foi possível adicionar o item", {
        description: message,
      });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!isVendedorRole && !isAdmin) {
        throw new Error("Apenas vendedores ou administradores podem remover itens.");
      }
      if (!orderId) throw new Error("Order ID is required");

      const { data, error } = await supabase.rpc("mutate_sicoob_order_item", {
        p_order_id: orderId,
        p_action: "remove",
        p_item_id: itemId,
        p_product_id: null,
        p_product_name: null,
        p_quantity: null,
        p_unit_price: null,
      });
      if (error) throw error;
      return Number(data);
    },
    onSuccess: () => {
      toast.success("Item removido com sucesso", {
        description: "O total do pedido foi atualizado."
      });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_items", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_item_logs", orderId] });
    },
    onError: (error: any) => {
      console.error("Error removing item:", error);
      const message = error.message || "Não foi possível completar a remoção do item.";
      toast.error("Erro ao remover item", {
        description: message,
      });
    },
  });

  return {
    addItem,
    removeItem,
  };
}
