/**
 * FavoritesHeatmap — Sparkline com contagem de itens salvos por semana (8 últimas).
 * Insight contextual: "você salva mais às {dia}" / "pico em {mês}".
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WeeklyActivityHeatmap, type WeeklyActivityRow } from "@/components/common/WeeklyActivityHeatmap";

type WeekRow = WeeklyActivityRow;

export function FavoritesHeatmap() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["favorites-weekly-count", user?.id],
    queryFn: async (): Promise<WeekRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc("get_favorites_weekly_count", { _weeks: 8 });
      if (error) throw error;
      return (data ?? []) as WeekRow[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return <WeeklyActivityHeatmap data={data ?? []} ariaLabel="Histórico semanal de favoritos" totalLabel="salvos" />;
}
