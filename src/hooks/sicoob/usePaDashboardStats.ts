import { useQuery } from "@tanstack/react-query";
import { sicoobStatsService } from "@/services/sicoob/statsService";
import { useAuth } from "@/contexts/AuthContext";

export const usePaDashboardStats = () => {
  const { profile } = useAuth();
  const paId = profile?.pa_id;

  return useQuery({
    queryKey: ["pa-dashboard-stats", paId],
    queryFn: async () => {
      if (!paId) return null;
      return sicoobStatsService.getPaDashboardStats(paId);
    },
    enabled: !!paId,
  });
};
