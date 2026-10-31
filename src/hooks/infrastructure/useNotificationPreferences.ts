import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  events_config: Json;
  dnd_enabled: boolean;
  dnd_start: string;
  dnd_end: string;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';
  channel_priorities: Record<string, number>;
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
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
        const { data: newData, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            email_enabled: true,
            push_enabled: true,
            whatsapp_enabled: false,
            dnd_enabled: false,
            dnd_start: '22:00:00',
            dnd_end: '08:00:00',
            digest_enabled: false,
            digest_frequency: 'daily',
            channel_priorities: { email: 1, push: 2, whatsapp: 3 },
            events_config: {
              order_status_change: true,
              new_order: true,
              approval_request: true,
            }
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newData as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_preferences"] });
      toast.success("Preferências atualizadas com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao atualizar preferências: ${error instanceof Error ? error.message : String(error)}`);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
  };
}
