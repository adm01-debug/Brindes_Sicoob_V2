import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useNotificationOmnichannel() {
  const queryClient = useQueryClient();

  const { data: digests, isLoading: isLoadingDigests } = useQuery({
    queryKey: ["notification_digests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_digests")
        .select("*")
        .order("scheduled_for", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: scheduled, isLoading: isLoadingScheduled } = useQuery({
    queryKey: ["scheduled_notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .order("scheduled_for", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["notification_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const cancelScheduled = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_notifications")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_notifications"] });
      toast.success("Notificação cancelada");
    },
  });

  return {
    digests,
    scheduled,
    logs,
    isLoading: isLoadingDigests || isLoadingScheduled || isLoadingLogs,
    cancelScheduled: cancelScheduled.mutate,
  };
}
