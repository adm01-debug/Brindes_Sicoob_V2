import { useEffect, useId, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
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
  const instanceId = useId();
  const onDataChangeRef = useRef(options.onDataChange);
  const queryKeyRef = useRef(options.queryKey);

  useEffect(() => {
    onDataChangeRef.current = options.onDataChange;
    queryKeyRef.current = options.queryKey;
  }, [options.onDataChange, options.queryKey]);

  useEffect(() => {
    logger.info(`Setting up realtime sync for table "${table}"`);

    // O nome precisa ser exclusivo por montagem. Dois consumidores da mesma
    // tabela não podem reutilizar um canal que já recebeu subscribe().
    const channelName = `realtime:${table}:${instanceId}`;
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
          
          onDataChangeRef.current?.(payload);

          if (queryKeyRef.current) {
            queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
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
  }, [table, event, options.filter, instanceId, queryClient]);
}
