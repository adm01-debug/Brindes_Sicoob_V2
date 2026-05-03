import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Bell, MessageSquare, Loader2 } from "lucide-react";

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Preferências de Notificação</CardTitle>
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
      </CardContent>
    </Card>
  );
}
