import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback, useRef } from "react";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  product_price: number;
  quantity: number;
  color_name: string | null;
  color_hex: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AddToCartInput {
  product_id: string;
  product_name: string;
  product_image_url?: string;
  product_price: number;
  quantity?: number;
  color_name?: string;
  color_hex?: string;
  metadata?: Record<string, any>;
}

const QUERY_KEY = "cart-items";

/**
 * useCart — Optimized cart management for Portal Sicoob
 * Refined for 10/10 technical excellence with debounced updates and optimistic UI.
 */
export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const log = createClientLogger('hook.useCart');
  
  // Ref for debounced updates to avoid DB spamming
  const debounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const cartQuery = useQuery<CartItem[]>({
    queryKey: [QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("cart_items")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data as CartItem[]) || [];
    },
    enabled: !!userId,
    staleTime: 30000, // Keep data fresh for 30s
  });

  const addItem = useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const startTime = performance.now();
      if (!userId) {
        log.warn('add_item_unauthenticated');
        toast.error("Você precisa estar logado para adicionar itens ao carrinho");
        throw new Error("Não autenticado");
      }

      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", input.product_id)
        .eq("color_name", input.color_name || null)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: (existing.quantity || 0) + (input.quantity || 1) })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: input.product_id,
            product_name: input.product_name,
            product_image_url: input.product_image_url || null,
            product_price: input.product_price,
            quantity: input.quantity || 1,
            color_name: input.color_name || null,
            color_hex: input.color_hex || null,
            metadata: input.metadata || {},
          });
        if (error) throw error;
      }
      
      const duration = performance.now() - startTime;
      log.info('add_item_success', { 
        product_id: input.product_id, 
        duration_ms: Math.round(duration) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Produto adicionado ao carrinho");
    },
    onError: (err: Error) => {
      log.error('add_item_error', { message: err.message });
      toast.error("Erro ao adicionar ao carrinho: " + err.message);
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const startTime = performance.now();
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      
      const duration = performance.now() - startTime;
      log.info('remove_item_success', { 
        item_id: itemId, 
        duration_ms: Math.round(duration) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Item removido do carrinho");
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<CartItem[]>([QUERY_KEY, userId]);
      if (previous) {
        queryClient.setQueryData<CartItem[]>(
          [QUERY_KEY, userId],
          previous.filter((it) => it.id !== itemId)
        );
      }
      return { previous };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const startTime = performance.now();
      if (quantity <= 0) {
        return removeItem.mutateAsync(itemId);
      }

      // If there's a pending debounce for this item, clear it since we are executing now
      if (debounceTimersRef.current[itemId]) {
        clearTimeout(debounceTimersRef.current[itemId]);
        delete debounceTimersRef.current[itemId];
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId);
      
      if (error) throw error;

      const duration = performance.now() - startTime;
      log.info('update_quantity_success', { 
        item_id: itemId, 
        quantity, 
        duration_ms: Math.round(duration) 
      });
    },
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<CartItem[]>([QUERY_KEY, userId]);
      
      if (previous) {
        queryClient.setQueryData<CartItem[]>(
          [QUERY_KEY, userId],
          previous.map((it) => (it.id === itemId ? { ...it, quantity } : it))
        );
      }
      
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEY, userId], context.previous);
      }
      toast.error("Erro ao atualizar quantidade");
    },
    onSettled: () => {
      // Don't refetch immediately to avoid jitter while user is still clicking
    },
  });

  // Helper with debounce for quantity inputs
  const debouncedUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    // Optimistically update UI first
    queryClient.setQueryData<CartItem[]>([QUERY_KEY, userId], (old) => {
      if (!old) return [];
      return old.map(it => it.id === itemId ? { ...it, quantity } : it);
    });

    if (debounceTimersRef.current[itemId]) {
      clearTimeout(debounceTimersRef.current[itemId]);
    }

    debounceTimersRef.current[itemId] = setTimeout(() => {
      updateQuantity.mutate({ itemId, quantity });
      delete debounceTimersRef.current[itemId];
    }, 1000); // 1s debounce
  }, [userId, queryClient, updateQuantity]);

  const clearCart = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<CartItem[]>([QUERY_KEY, userId]);
      queryClient.setQueryData<CartItem[]>([QUERY_KEY, userId], []);
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEY, userId], context.previous);
      }
      toast.error("Erro ao limpar carrinho");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, userId] });
    },
  });

  const cartItems = cartQuery.data || [];
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price * item.quantity), 0);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const getOptimisticQuantity = useCallback((itemId: string) => {
    return cartItems.find(it => it.id === itemId)?.quantity ?? 0;
  }, [cartItems]);

  return {
    items: cartItems,
    isLoading: cartQuery.isLoading,
    subtotal,
    totalItemsCount,
    addItem,
    removeItem,
    updateQuantity: debouncedUpdateQuantity, // Use debounced version by default
    forceUpdateQuantity: updateQuantity.mutate, // Expose raw mutation for immediate calls
    clearCart,
    refetch: cartQuery.refetch,
    getOptimisticQuantity,
  };
}
