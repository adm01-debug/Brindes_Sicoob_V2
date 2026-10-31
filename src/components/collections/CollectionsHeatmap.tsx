/**
 * CollectionsHeatmap — Sparkline com contagem de itens adicionados por semana (8 últimas).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyActivityHeatmap, type WeeklyActivityRow } from "@/components/common/WeeklyActivityHeatmap";

type WeekRow = WeeklyActivityRow;

export function CollectionsHeatmap() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["collections-weekly-count", user?.id],
    queryFn: async (): Promise<WeekRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc("get_collections_weekly_count", { _weeks: 8 });
      if (error) throw error;
      return (data ?? []) as WeekRow[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return <WeeklyActivityHeatmap data={data ?? []} ariaLabel="Histórico semanal de coleções" totalLabel="adicionados" />;
}
