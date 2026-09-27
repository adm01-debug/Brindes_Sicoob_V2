import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type LatestArtworkDecision = {
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  version: number;
} | null;

export const productionReadinessQueryKey = (orderId?: string) =>
  ['sicoob-order-artwork', orderId, 'latest'] as const;

export function useOrderProductionReadiness(orderId?: string) {
  return useQuery({
    queryKey: productionReadinessQueryKey(orderId),
    queryFn: async (): Promise<LatestArtworkDecision> => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('sicoob_order_artwork_versions')
        .select('status, version')
        .eq('order_id', orderId)
        .eq('is_latest', true)
        .maybeSingle();

      if (error) throw error;
      return data as LatestArtworkDecision;
    },
    enabled: Boolean(orderId),
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
