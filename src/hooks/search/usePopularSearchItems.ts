
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PopularProduct {
  id: string;
  name: string;
  sku: string;
  category_name: string | null;
  view_count: number;
}

export function usePopularSearchItems(enabled: boolean) {
  return useQuery({
    queryKey: ["popular-search-products"],
    queryFn: async (): Promise<PopularProduct[]> => {
      const { data: viewsData, error } = await supabase
        .from("product_views")
        .select("product_id, product_name, product_sku")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (!viewsData) return [];

      const viewCounts = viewsData.reduce((acc: Record<string, { count: number; name: string; sku: string }>, v) => {
        if (v.product_id) {
          const current = acc[v.product_id] ?? { count: 0, name: v.product_name ?? "", sku: v.product_sku || "" };
          current.count += 1;
          acc[v.product_id] = current;
        }
        return acc;
      }, {});

      return Object.entries(viewCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([id, d]) => ({ 
          id, 
          name: d.name, 
          sku: d.sku, 
          category_name: null, 
          view_count: d.count 
        }));
    },
    enabled,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}
