import { useQuery } from "@tanstack/react-query";
import { sicoobStatsService } from "@/services/sicoob/statsService";
import { useAuth } from "@/contexts/AuthContext";

export const useSellerDashboardStats = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["seller-dashboard-stats", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      return sicoobStatsService.getSellerDashboardStats(profile.id);
    },
    enabled: !!profile?.id
  });
};
