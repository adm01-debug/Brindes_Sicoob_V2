import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  events_config: any;
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
        // Create default preferences if not exists
        const { data: newData, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            email_enabled: true,
            push_enabled: true,
            whatsapp_enabled: false,
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
    onError: (error: any) => {
      toast.error(`Erro ao atualizar preferências: ${error.message}`);
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferences.mutate,
  };
}
