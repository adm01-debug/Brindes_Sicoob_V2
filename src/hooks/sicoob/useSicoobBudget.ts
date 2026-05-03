import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useSicoobBudget = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["sicoob-budget", profile?.pa_id],
    queryFn: async () => {
      if (!profile?.pa_id) return null;

      const { data, error } = await supabase
        .from("pa_budgets")
        .select("*")
        .eq("pa_id", profile.pa_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.pa_id,
  });
};
