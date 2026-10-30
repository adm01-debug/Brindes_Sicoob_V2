import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePendingQuotesCount() {
  return useQuery({
    queryKey: ["pending-quotes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        // rls-allow: contagem pessoal protegida pela policy de quotes
        .from("quotes")
        .select("*", { count: 'exact', head: true })
        .eq("status", "pending");

      if (error) throw error;
      return count || 0;
    },
  });
}
