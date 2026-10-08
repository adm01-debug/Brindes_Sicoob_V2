import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slack, Mail, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface NotificationSettingPayload {
  channel: 'slack' | 'email';
  webhook_url: string | null;
  recipient_email: string | null;
  is_active: boolean | null;
}

export const NotificationSettingsTab = () => {
  const queryClient = useQueryClient();
  const [selectedPa, setSelectedPa] = useState<string | null>(null);

  const { data: pas } = useQuery({
    queryKey: ["postos_atendimento_names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("postos_atendimento").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["pa_notification_settings", selectedPa],
    queryFn: async () => {
      if (!selectedPa) return [];
      const { data, error } = await supabase
        .from("pa_notification_settings")
        .select("*")
        .eq("pa_id", selectedPa);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPa,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: NotificationSettingPayload) => {
      const { error } = await supabase
        .from("pa_notification_settings")
        .upsert({
          pa_id: selectedPa!,
          channel: payload.channel,
          webhook_url: payload.webhook_url,
          recipient_email: payload.recipient_email,
          is_active: payload.is_active
        }, { onConflict: 'pa_id,channel' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa_notification_settings", selectedPa] });
      toast.success("Configurações salvas!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao salvar: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  const getSetting = (channel: 'slack' | 'email'): NotificationSettingPayload => {
    const setting = settings?.find(s => s.channel === channel);
    return setting
      ? {
          channel,
          is_active: setting.is_active,
          webhook_url: setting.webhook_url,
          recipient_email: setting.recipient_email,
        }
      : { channel, is_active: false, webhook_url: '', recipient_email: '' };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Configurações de Notificação por PA
          </CardTitle>
          <CardDescription>
            Defina canais externos para alertar gestores sobre pedidos que excedem a alçada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Selecione o Posto de Atendimento</Label>
            <select 
              className="w-full p-2 border rounded-md"
              onChange={(e) => setSelectedPa(e.target.value)}
              value={selectedPa || ""}
            >
              <option value="">Selecione um PA...</option>
              {pas?.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {selectedPa && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slack */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Slack className="h-4 w-4 text-[#4A154B]" />
                      Slack Webhook
                    </CardTitle>
                    <Switch
                      checked={getSetting('slack').is_active ?? false}
                      onCheckedChange={(val) => upsertMutation.mutate({ ...getSetting('slack'), is_active: val })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Webhook URL</Label>
                    <Input
                      placeholder="https://hooks.slack.com/services/..."
                      defaultValue={getSetting('slack').webhook_url ?? ''}
                      onBlur={(e) => upsertMutation.mutate({ ...getSetting('slack'), webhook_url: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      E-mail do Gestor
                    </CardTitle>
                    <Switch
                      checked={getSetting('email').is_active ?? false}
                      onCheckedChange={(val) => upsertMutation.mutate({ ...getSetting('email'), is_active: val })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">E-mail para Alerta</Label>
                    <Input
                      placeholder="gestor@singular.com.br"
                      defaultValue={getSetting('email').recipient_email ?? ''}
                      onBlur={(e) => upsertMutation.mutate({ ...getSetting('email'), recipient_email: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
