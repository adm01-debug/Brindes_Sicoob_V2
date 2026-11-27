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

interface NotificationSettingsTabProps {
  /** Leitura liberada ao gestor; gravar pa_notification_settings exige o papel `admin`. */
  readOnly?: boolean;
}

/**
 * A URL do webhook do Slack e credencial de publicacao: a coluna esta fora do GRANT
 * de `authenticated`, entao a leitura passa pela RPC restrita a administracao.
 */
async function carregarWebhookSlack(paId: string, readOnly: boolean): Promise<string | null> {
  if (readOnly) return null;
  const { data } = await supabase.rpc("sicoob_pa_slack_webhook", { p_pa_id: paId });
  return data ?? null;
}

/** Campos do webhook do Slack ficam vazios para quem nao administra. */
function webhookExibido(readOnly: boolean, webhookUrl: string | null) {
  return {
    valor: readOnly ? '' : webhookUrl ?? '',
    dica: readOnly ? 'Visível apenas para a administração' : 'https://hooks.slack.com/services/...',
  };
}

export const NotificationSettingsTab = ({ readOnly = false }: NotificationSettingsTabProps) => {
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
    // Modo no cache: o gestor le sem webhook (readOnly) e a administracao le com
    // webhook; a mesma chave serviria o resultado de uma tela na outra.
    queryKey: ["pa_notification_settings", selectedPa, readOnly ? "leitura" : "admin"],
    queryFn: async () => {
      if (!selectedPa) return [];
      const { data, error } = await supabase
        .from("pa_notification_settings")
        .select("id, pa_id, channel, recipient_email, is_active")
        .eq("pa_id", selectedPa);
      if (error) throw error;
      const rows = data ?? [];
      const webhook = await carregarWebhookSlack(selectedPa, readOnly);
      return rows.map((row) => ({
        ...row,
        webhook_url: row.channel === "slack" ? webhook : null,
      }));
    },
    enabled: !!selectedPa,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: NotificationSettingPayload) => {
      // A coluna `webhook_url` esta fora do GRANT de `authenticated`, entao o
      // upsert direto falha no ON CONFLICT (o PostgreSQL exige SELECT na coluna).
      // A gravacao passa pela RPC restrita a administracao.
      const { error } = await supabase.rpc("sicoob_pa_notification_settings_set", {
        p_pa_id: selectedPa!,
        p_channel: payload.channel,
        p_webhook_url: payload.webhook_url,
        p_recipient_email: payload.recipient_email,
        p_is_active: payload.is_active,
      });
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

  const salvar = (payload: NotificationSettingPayload) => {
    if (!readOnly) upsertMutation.mutate(payload);
  };

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
          {readOnly && (
            <p className="text-xs text-muted-foreground">
              Somente a administração altera estes canais. Aqui você acompanha a configuração vigente.
            </p>
          )}
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
                      disabled={readOnly}
                      onCheckedChange={(val) => salvar({ ...getSetting('slack'), is_active: val })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Webhook URL</Label>
                    <Input
                      placeholder={webhookExibido(readOnly, null).dica}
                      defaultValue={webhookExibido(readOnly, getSetting('slack').webhook_url).valor}
                      disabled={readOnly}
                      onBlur={(e) => salvar({ ...getSetting('slack'), webhook_url: e.target.value })}
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
                      disabled={readOnly}
                      onCheckedChange={(val) => salvar({ ...getSetting('email'), is_active: val })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">E-mail para Alerta</Label>
                    <Input
                      placeholder="gestor@singular.com.br"
                      defaultValue={getSetting('email').recipient_email ?? ''}
                      disabled={readOnly}
                      onBlur={(e) => salvar({ ...getSetting('email'), recipient_email: e.target.value })}
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
