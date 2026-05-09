import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuotesStockStatus(quoteIds: string[]) {
  return useQuery({
    queryKey: ["quotes-stock-status", quoteIds],
    enabled: quoteIds.length > 0,
    queryFn: async () => {
      // Fetch all items for these quotes
      const { data: items, error } = await supabase
        .from("quote_items")
        .select(`
          id, 
          quote_id, 
          product_id, 
          quantity, 
          color_name, 
          size_code
        `)
        .in("quote_id", quoteIds);

      if (error) throw error;
      if (!items) return {};

      // In a real scenario, we would join with products/variants to get current stock.
      // For this demo/implementation, we'll simulate the logic or fetch current stock if tables exist.
      // Let's assume there's a products table with stock or similar.
      
      const productIds = Array.from(new Set(items.map(i => i.product_id)));
      
      // Attempt to get stock from bitrix_products or similar
      const { data: products } = await supabase
        .from("bitrix_products")
        .select("id, stock_quantity")
        .in("id", productIds);

      const stockMap = new Map(products?.map(p => [p.id, p.stock_quantity || 0]) || []);
      
      const issueMap: Record<string, boolean> = {};
      
      items.forEach(item => {
        const currentStock = stockMap.get(item.product_id) || 0;
        if (item.quantity > currentStock) {
          issueMap[item.quote_id] = true;
        }
      });

      return issueMap;
    },
    staleTime: 30000, // 30 seconds
  });
}
