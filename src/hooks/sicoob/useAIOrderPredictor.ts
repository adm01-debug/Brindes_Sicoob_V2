import { useQuery } from "@tanstack/react-query";
import { subMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { deriveProductRecurrenceSignals } from "@/lib/sicoob/operationalMetrics";

export function useAIOrderPredictor() {
  const { user } = useAuth();
  const windowStart = subMonths(new Date(), 12);
  const query = useQuery({
    queryKey: ["sicoob-product-recurrence", user?.id, windowStart.toISOString().slice(0, 10)],
    queryFn: async () => {
      if (!user?.id) return { predictions: [], sampleSize: 0 };
      const { data: orders, error: ordersError } = await supabase
        .from("sicoob_orders")
        .select("id,created_at")
        .eq("created_by", user.id)
        .eq("status", "completed")
        .gte("created_at", windowStart.toISOString())
        .order("created_at", { ascending: false });
      if (ordersError) throw ordersError;

      const orderIds = (orders ?? []).map((order) => order.id);
      if (orderIds.length === 0) return { predictions: [], sampleSize: 0 };
      const { data: items, error: itemsError } = await supabase
        .from("sicoob_order_items")
        .select("order_id,product_name,quantity")
        .in("order_id", orderIds);
      if (itemsError) throw itemsError;

      return {
        predictions: deriveProductRecurrenceSignals(orders ?? [], items ?? []),
        sampleSize: orderIds.length,
      };
    },
    enabled: Boolean(user?.id),
  });

  return {
    predictions: query.data?.predictions ?? [],
    sampleSize: query.data?.sampleSize ?? 0,
    windowStart,
    isLoading: query.isLoading,
    error: query.error,
  };
}
