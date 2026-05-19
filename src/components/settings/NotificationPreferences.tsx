import { useNotificationPreferences } from "@/hooks/infrastructure/useNotificationPreferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Bell, MessageSquare, Loader2, Moon, Clock, Inbox, ShieldCheck, Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationOmnichannelPanel } from "./NotificationOmnichannelPanel";

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();
  const [activeView, setActiveView] = React.useState("preferences");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notificações</h2>
          <p className="text-muted-foreground">Gerencie como você recebe alertas e resumos.</p>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="preferences" className="gap-2"><Settings2 className="h-4 w-4" /> Preferências</TabsTrigger>
          <TabsTrigger value="omnichannel" className="gap-2"><Inbox className="h-4 w-4" /> Painel Omnichannel</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">Configurações de Canais</CardTitle>
              <CardDescription>
                Escolha como você deseja ser alertado sobre pedidos e orçamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-4">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">E-mail</Label>
              <p className="text-xs text-muted-foreground">
                Receba resumos e alertas importantes por e-mail.
              </p>
            </div>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences?.email_enabled}
            onCheckedChange={(checked) => updatePreferences({ email_enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between space-x-4 border-t pt-6">
          <div className="flex items-center space-x-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="app-notifications">Notificações no App</Label>
              <p className="text-xs text-muted-foreground">
                Alertas em tempo real dentro da plataforma.
              </p>
            </div>
          </div>
          <Switch
            id="app-notifications"
            checked={preferences?.push_enabled}
            onCheckedChange={(checked) => updatePreferences({ push_enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between space-x-4 border-t pt-6">
          <div className="flex items-center space-x-4">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp-notifications">WhatsApp (Beta)</Label>
              <p className="text-xs text-muted-foreground">
                Receba atualizações de status via WhatsApp.
              </p>
            </div>
          </div>
          <Switch
            id="whatsapp-notifications"
            checked={preferences?.whatsapp_enabled}
            onCheckedChange={(checked) => updatePreferences({ whatsapp_enabled: checked })}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Foco e Silêncio</h3>
          </div>
          
          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-0.5">
              <Label htmlFor="dnd-enabled">Não Perturbe (DND)</Label>
              <p className="text-xs text-muted-foreground">
                Silenciar todas as notificações durante o período definido.
              </p>
            </div>
            <Switch
              id="dnd-enabled"
              checked={preferences?.dnd_enabled}
              onCheckedChange={(checked) => updatePreferences({ dnd_enabled: checked })}
            />
          </div>

          {preferences?.dnd_enabled && (
            <div className="grid grid-cols-2 gap-4 pl-9 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Início</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    type="time" 
                    value={preferences.dnd_start?.substring(0, 5)} 
                    onChange={(e) => updatePreferences({ dnd_start: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fim</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    type="time" 
                    value={preferences.dnd_end?.substring(0, 5)} 
                    onChange={(e) => updatePreferences({ dnd_end: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumos (Digest)</h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Otimização</Badge>
          </div>

          <div className="flex items-center justify-between space-x-4">
            <div className="space-y-0.5">
              <Label htmlFor="digest-enabled">Agrupar Notificações</Label>
              <p className="text-xs text-muted-foreground">
                Receba um único resumo periódico em vez de múltiplos alertas individuais.
              </p>
            </div>
            <Switch
              id="digest-enabled"
              checked={preferences?.digest_enabled}
              onCheckedChange={(checked) => updatePreferences({ digest_enabled: checked })}
            />
          </div>

          {preferences?.digest_enabled && (
            <div className="pl-9 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência do Resumo</Label>
                <Select 
                  value={preferences.digest_frequency} 
                  onValueChange={(val: 'daily' | 'weekly') => updatePreferences({ digest_frequency: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário (Todo dia às 08:00)</SelectItem>
                    <SelectItem value="weekly">Semanal (Segunda-feira às 08:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-3 mt-4 border border-border">
          <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Segurança de Dados</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Suas preferências são sincronizadas de ponta a ponta e respeitam as políticas de privacidade da Lovable Cloud.
            </p>
          </div>
        </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="omnichannel">
        <NotificationOmnichannelPanel />
      </TabsContent>
    </Tabs>
  </div>
);
}
