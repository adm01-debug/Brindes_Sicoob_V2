import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, QueryKey } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

/**
 * Hook to synchronize React Query cache with Supabase Realtime changes.
 */
export function useRealtimeSync(
  table: string,
  queryKey: QueryKey,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
  } = {}
) {
  const queryClient = useQueryClient();
  const event = options.event || '*';

  useEffect(() => {
    logger.info(`Setting up realtime sync for table "${table}"`);
    
    const channel = supabase
      .channel(`realtime:${table}:${JSON.stringify(queryKey)}`)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter: options.filter,
        },
        (payload) => {
          logger.info(`Realtime change detected in "${table}":`, payload);
          // Invalidate the query to trigger a refetch
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info(`Successfully subscribed to realtime changes in "${table}"`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKey, event, options.filter, queryClient]);
}
