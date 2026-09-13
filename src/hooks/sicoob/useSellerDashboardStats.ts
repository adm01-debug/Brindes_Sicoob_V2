import { useQuery } from "@tanstack/react-query";
import { sicoobStatsService } from "@/services/sicoob/statsService";
import { useAuth } from "@/contexts/AuthContext";

export const useSellerDashboardStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["seller-dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return sicoobStatsService.getSellerDashboardStats(user.id);
    },
    enabled: !!user?.id
  });
};
