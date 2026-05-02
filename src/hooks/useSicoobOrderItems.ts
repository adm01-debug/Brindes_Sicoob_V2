import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useSicoobOrderItems(orderId?: string) {
  const queryClient = useQueryClient();
  const { isVendedorRole, isAdmin } = useAuth();


  const updateOrderTotal = async (orderId: string) => {
    const { data: items, error: itemsError } = await supabase
      .from("sicoob_order_items")
      .select("total_price")
      .eq("order_id", orderId);

    if (itemsError) throw itemsError;

    const total = items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

    const { error: orderError } = await supabase
      .from("sicoob_orders")
      .update({ total_amount: total, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (orderError) throw orderError;
    
    return total;
  };

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

      // Validar status do pedido antes de adicionar
      const { data: order, error: orderCheckError } = await supabase
        .from("sicoob_orders")
        .select("status")
        .eq("id", orderId)
        .single();
      
      if (orderCheckError) throw orderCheckError;
      if (order?.status !== 'pending' && order?.status !== 'draft') {
        throw new Error(`Não é possível adicionar itens a um pedido com status "${order?.status}".`);
      }



      const totalPrice = quantity * unitPrice;

      const { error: itemError } = await supabase
        .from("sicoob_order_items")
        .insert({
          order_id: orderId,
          product_id: productId,
          product_name: productName,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
        });

      if (itemError) throw itemError;

      return await updateOrderTotal(orderId);
    },
    onSuccess: () => {
      toast.success("Item adicionado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_items", orderId] });
    },
    onError: (error: any) => {
      console.error("Error adding item:", error);
      toast.error("Erro ao adicionar item: " + error.message);
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      if (!isVendedorRole && !isAdmin) {
        throw new Error("Apenas vendedores ou administradores podem remover itens.");
      }
      if (!orderId) throw new Error("Order ID is required");

      // Validar status do pedido antes de remover
      const { data: order, error: orderCheckError } = await supabase
        .from("sicoob_orders")
        .select("status")
        .eq("id", orderId)
        .single();
      
      if (orderCheckError) throw orderCheckError;
      if (order?.status !== 'pending' && order?.status !== 'draft') {
        throw new Error(`Não é possível remover itens de um pedido com status "${order?.status}".`);
      }



      const { error: deleteError } = await supabase
        .from("sicoob_order_items")
        .delete()
        .eq("id", itemId);

      if (deleteError) throw deleteError;

      return await updateOrderTotal(orderId);
    },
    onSuccess: () => {
      toast.success("Item removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ["sicoob_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["sicoob_order_items", orderId] });
    },
    onError: (error: any) => {
      console.error("Error removing item:", error);
      toast.error("Erro ao remover item: " + error.message);
    },
  });

  return {
    addItem,
    removeItem,
  };
}
