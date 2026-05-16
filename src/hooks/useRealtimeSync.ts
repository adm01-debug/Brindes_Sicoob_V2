import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, QueryKey } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

/**
 * Hook to synchronize UI with Supabase Realtime changes.
 */
export function useRealtimeSync(
  table: string,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onDataChange?: (payload: any) => void;
    queryKey?: QueryKey;
  } = {}
) {
  const queryClient = useQueryClient();
  const event = options.event || '*';

  useEffect(() => {
    logger.info(`Setting up realtime sync for table "${table}"`);
    
    const channelName = `realtime:${table}:${options.queryKey ? JSON.stringify(options.queryKey) : Date.now()}`;
    const channel = supabase
      .channel(channelName)
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
          
          if (options.onDataChange) {
            options.onDataChange(payload);
          }
          
          if (options.queryKey) {
            queryClient.invalidateQueries({ queryKey: options.queryKey });
          }
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
  }, [table, options.queryKey, options.onDataChange, event, options.filter, queryClient]);
}
