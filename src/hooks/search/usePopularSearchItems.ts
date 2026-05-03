
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PopularProduct {
  id: string;
  name: string;
  sku: string;
  category_name: string | null;
  view_count: number;
}

export function usePopularSearchItems(enabled: boolean) {
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        const { data: viewsData } = await supabase
          .from("product_views")
          .select("product_id, product_name, product_sku")
          .order("created_at", { ascending: false })
          .limit(100);
        
        if (!viewsData) return;

        const viewCounts = viewsData.reduce((acc: Record<string, { count: number; name: string; sku: string }>, v) => {
          if (v.product_id) {
            if (!acc[v.product_id]) acc[v.product_id] = { count: 0, name: v.product_name ?? "", sku: v.product_sku || "" };
            acc[v.product_id].count++;
          }
          return acc;
        }, {});

        setPopularProducts(
          Object.entries(viewCounts)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5)
            .map(([id, d]) => ({ id, name: d.name, sku: d.sku, category_name: null, view_count: d.count }))
        );
      } catch { /* silent */ }
    })();
  }, [enabled]);

  return popularProducts;
}
