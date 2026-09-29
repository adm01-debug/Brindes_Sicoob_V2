import { useEffect, useId, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, QueryKey } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

/**
 * Hook to synchronize UI with Supabase Realtime changes.
 *
 * Each hook instance gets a stable unique channel name via useId() to prevent
 * collision when multiple callers subscribe to the same table simultaneously
 * (e.g. parent + child both calling useQuotes in the same render cycle).
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
  // Stable unique ID per hook instance — avoids same-millisecond Date.now() collisions
  const instanceId = useId();

  // Capture the mutable callback in a ref so it never needs to enter the effect deps.
  // This prevents the subscription from being torn down and rebuilt on every render
  // when the caller passes an inline function.
  const onDataChangeRef = useRef(options.onDataChange);
  useEffect(() => {
    onDataChangeRef.current = options.onDataChange;
  });

  useEffect(() => {
    logger.info(`Setting up realtime sync for table "${table}"`);

    const channelName = options.queryKey
      ? `realtime:${table}:${JSON.stringify(options.queryKey)}`
      : `realtime:${table}:${instanceId}`;

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
  }, [table, event, options.filter, options.queryKey, instanceId, queryClient]);
}
