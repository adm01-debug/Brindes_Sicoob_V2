import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slack, Mail, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationSettingPayload {
  channel: 'slack' | 'email';
  /** Campos são patch: o que não mudou não entra no payload (NULL no banco = não mexer). */
  webhook_url?: string | null;
  recipient_email?: string | null;
  is_active?: boolean | null;
}

interface NotificationSettingsTabProps {
  /** Leitura liberada ao gestor; gravar pa_notification_settings exige `is_supervisor_or_above`. */
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
function webhookExibido(readOnly: boolean, webhookUrl: string | null | undefined) {
  return {
    valor: readOnly ? '' : webhookUrl ?? '',
    dica: readOnly ? 'Visível apenas para a administração' : 'https://hooks.slack.com/services/...',
  };
}

/**
 * A coluna `webhook_url` esta fora do GRANT de `authenticated`, entao o upsert
 * direto falha no ON CONFLICT (o PostgreSQL exige SELECT na coluna). A gravacao
 * passa pela RPC restrita a administracao; argumento NULL significa "nao mexer",
 * por isso so o campo alterado sai no payload.
 */
async function salvarConfiguracao(paId: string, payload: NotificationSettingPayload) {
  const { error } = await supabase.rpc("sicoob_pa_notification_settings_set", {
    p_pa_id: paId,
    p_channel: payload.channel,
    p_webhook_url: payload.webhook_url ?? null,
    p_recipient_email: payload.recipient_email ?? null,
    p_is_active: payload.is_active ?? null,
  });
  if (error) throw error;
}

/** Valor que o campo ja mostra: sem ele a guarda de onBlur nao tem referencia. */
function valorAtualDoCampo(
  channel: 'slack' | 'email',
  getSetting: (c: 'slack' | 'email') => NotificationSettingPayload,
  readOnly: boolean,
): string {
  if (channel !== 'slack') return getSetting('email').recipient_email ?? '';
  return webhookExibido(readOnly, getSetting('slack').webhook_url).valor;
}

type ConfiguracaoDoPa = Awaited<ReturnType<typeof carregarConfiguracoes>>[number];

async function carregarConfiguracoes(paId: string | null, readOnly: boolean) {
  if (!paId) return [];
  const { data, error } = await supabase
    .from("pa_notification_settings")
    .select("id, pa_id, channel, recipient_email, is_active")
    .eq("pa_id", paId);
  if (error) throw error;
  const rows = data ?? [];
  const webhook = await carregarWebhookSlack(paId, readOnly);
  return rows.map((row) => ({
    ...row,
    webhook_url: row.channel === "slack" ? webhook : null,
  }));
}

function configuracaoDoCanal(
  settings: ConfiguracaoDoPa[] | undefined,
  channel: 'slack' | 'email',
): NotificationSettingPayload {
  const setting = settings?.find((s) => s.channel === channel);
  if (!setting) return { channel, is_active: false, webhook_url: '', recipient_email: '' };
  return {
    channel,
    is_active: setting.is_active,
    webhook_url: setting.webhook_url,
    recipient_email: setting.recipient_email,
  };
}

export const NotificationSettingsTab = ({ readOnly = false }: NotificationSettingsTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedPa, setSelectedPa] = useState<string | null>(null);
  // A tela de leitura e a de administracao nao compartilham cache.
  const modo = readOnly ? "leitura" : "admin";

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
    // webhook; a mesma chave serviria o resultado de uma tela na outra. O id do
    // usuario entra na chave porque trocar de conta na mesma aba nao pode servir
    // o cache da conta anterior (a RLS so vale para a requisicao, nao para o cache).
    queryKey: ["pa_notification_settings", user?.id, selectedPa, modo],
    queryFn: () => carregarConfiguracoes(selectedPa, readOnly),
    enabled: !!selectedPa,
  });

  const upsertMutation = useMutation({
    mutationFn: (payload: NotificationSettingPayload) => salvarConfiguracao(selectedPa!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pa_notification_settings", user?.id, selectedPa] });
      toast.success("Configurações salvas!");
    },
    onError: (error: unknown) => {
      toast.error("Erro ao salvar: " + (error instanceof Error ? error.message : String(error)));
    }
  });

  const salvar = (payload: NotificationSettingPayload) => {
    if (!readOnly) upsertMutation.mutate(payload);
  };

  // O onBlur dispara mesmo quando o usuario so passou pelo campo (ou apertou Tab).
  // Sem esta guarda a URL/webhook vazia do PA atual seria gravada por cima do
  // valor real ao trocar de PA, porque o DEFAULT do Input nao carrega o segredo.
  const salvarTextoDoCampo = (
    channel: 'slack' | 'email',
    campo: 'webhook_url' | 'recipient_email',
    digitado: string,
  ) => {
    if (!podeSalvar) return;
    if (digitado.trim() === valorAtualDoCampo(channel, getSetting, readOnly)) return;
    const payload: NotificationSettingPayload = channel === 'slack'
      ? { channel, webhook_url: digitado }
      : { channel, recipient_email: digitado };
    salvar(payload);
  };

  const getSetting = (channel: 'slack' | 'email') => configuracaoDoCanal(settings, channel);
  const podeSalvar = !readOnly;
  const ativo = (channel: 'slack' | 'email') => getSetting(channel).is_active ?? false;

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
            // Trocar de PA remonta os campos de destino: sem o key, o `defaultValue`
            // do Input mantem o texto digitado no PA anterior e o onBlur grava esse
            // valor no novo PA sem o usuario ter editado nada.
            <div key={selectedPa} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slack */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Slack className="h-4 w-4 text-[#4A154B]" />
                      Slack Webhook
                    </CardTitle>
                    <Switch
                      checked={ativo('slack')}
                      disabled={readOnly}
                      onCheckedChange={(val) => salvar({ channel: 'slack', is_active: val })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Webhook URL</Label>
                    <Input
                      key={`slack-${selectedPa}`}
                      placeholder={webhookExibido(readOnly, null).dica}
                      defaultValue={webhookExibido(readOnly, getSetting('slack').webhook_url).valor}
                      disabled={readOnly}
                      onBlur={(e) => salvarTextoDoCampo('slack', 'webhook_url', e.target.value)}
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
                      checked={ativo('email')}
                      disabled={readOnly}
                      onCheckedChange={(val) => salvar({ channel: 'email', is_active: val })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">E-mail para Alerta</Label>
                    <Input
                      key={`email-${selectedPa}`}
                      placeholder="gestor@singular.com.br"
                      defaultValue={getSetting('email').recipient_email ?? ''}
                      disabled={readOnly}
                      onBlur={(e) => salvarTextoDoCampo('email', 'recipient_email', e.target.value)}
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
