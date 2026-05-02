import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  events_config: Record<string, boolean>;
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification_preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        // Inicializa se não existir
        const defaultPrefs = {
          user_id: user.id,
          email_enabled: true,
          push_enabled: false,
          whatsapp_enabled: false,
          events_config: { order_status_change: true, pilot_update: true, new_order: true }
        };
        return defaultPrefs as NotificationPreferences;
      }
      
      return data as NotificationPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ ...patch, user_id: user.id })
        .eq("user_id", user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_preferences"] });
      toast.success("Preferências salvas");
    },
  });

  return { ...query, updatePreferences };
}
