import { supabase } from "@/integrations/supabase/client";

// Os dois eventos usam colunas diferentes para identificar o autor.
export async function loadTrendsActivity(since: string, userId: string | null) {
  let viewsQuery = supabase.from("product_views")
    .select("product_id, product_name, created_at")
    .gte("created_at", since);
  let searchesQuery = supabase.from("search_analytics")
    .select("search_term, created_at")
    .gte("created_at", since);
  if (userId) {
    viewsQuery = viewsQuery.eq("seller_id", userId);
    searchesQuery = searchesQuery.eq("user_id", userId);
  }
  const [views, searches] = await Promise.all([viewsQuery, searchesQuery]);
  if (views.error || searches.error) throw views.error || searches.error;
  return { views: views.data ?? [], searches: searches.data ?? [] };
}
