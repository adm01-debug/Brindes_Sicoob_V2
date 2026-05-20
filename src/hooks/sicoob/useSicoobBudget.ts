import { useQuery } from "@tanstack/react-query";
import { sicoobBudgetService } from "@/services/sicoob/budgetService";
import { useAuth } from "@/contexts/AuthContext";

export const useSicoobBudget = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["sicoob-budget", profile?.pa_id],
    queryFn: async () => {
      if (!profile?.pa_id) return null;
      return sicoobBudgetService.getBudgetByPa(profile.pa_id);
    },
    enabled: !!profile?.pa_id,
  });
};
