import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Wifi, MapPin } from "lucide-react";

interface SecuritySettings {
  ip_whitelist_enabled: boolean;
  city_whitelist_enabled: boolean;
  max_failed_attempts: number;
  lockout_duration_minutes: number;
}

interface SecuritySettingsCardProps {
  settings: SecuritySettings | null;
  onUpdate: (settings: Partial<SecuritySettings>) => void;
}

function WhitelistToggle(props: { icon: typeof Wifi; label: string; description: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  const { label, description, checked, onCheckedChange } = props;
  const Icon = props.icon;
  return <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20"><div className="space-y-1"><Label className="font-medium flex items-center gap-2"><Icon className="h-4 w-4" />{label}</Label><p className="text-xs text-muted-foreground">{description}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} /></div>;
}

function SecurityNumberSetting({ label, value, min, fallback, onChange }: { label: string; value: number; min: number; fallback: number; onChange: (value: number) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type="number" min={min} value={value} onChange={(event) => onChange(parseInt(event.target.value) || fallback)} className="w-32" /></div>;
}

export function SecuritySettingsCard({ settings, onUpdate }: SecuritySettingsCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Configurações de Segurança de Acesso
        </CardTitle>
        <CardDescription>
          Ative ou desative as restrições de acesso por IP e cidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WhitelistToggle icon={Wifi} label="Whitelist de IPs" description="Apenas IPs cadastrados podem acessar" checked={settings?.ip_whitelist_enabled ?? false} onCheckedChange={(checked) => onUpdate({ ip_whitelist_enabled: checked })} />
          <WhitelistToggle icon={MapPin} label="Whitelist de Cidades" description="Apenas cidades cadastradas podem acessar" checked={settings?.city_whitelist_enabled ?? false} onCheckedChange={(checked) => onUpdate({ city_whitelist_enabled: checked })} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecurityNumberSetting label="Máx. tentativas falhadas antes do bloqueio" value={settings?.max_failed_attempts ?? 5} min={0} fallback={0} onChange={(value) => onUpdate({ max_failed_attempts: value })} />
          <SecurityNumberSetting label="Duração do bloqueio (minutos)" value={settings?.lockout_duration_minutes ?? 15} min={1} fallback={15} onChange={(value) => onUpdate({ lockout_duration_minutes: value })} />
        </div>
      </CardContent>
    </Card>
  );
}
