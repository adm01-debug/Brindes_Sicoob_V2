import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Zap, 
  MessageSquare, 
  Settings, 
  ShieldCheck,
  Package,
  Code2,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SystemFeatureToggles() {
  const { isDev } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const fetchFeatures = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .like('key', 'feature_%');
      
      if (error) throw error;

      const featureMap: Record<string, boolean> = {};
      data?.forEach(item => {
        featureMap[item.key] = !!item.value;
      });
      setFeatures(featureMap);
    } catch (error) {
      console.error("Error fetching features:", error);
      toast.error("Erro ao carregar flags do sistema");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDev) fetchFeatures();
  }, [isDev]);

  const toggleFeature = async (key: string) => {
    const newValue = !features[key];
    
    // Optimistic update
    setFeatures(prev => ({ ...prev, [key]: newValue }));

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: newValue })
        .eq('key', key);
      
      if (error) throw error;
      toast.success(`${key} atualizado`);
    } catch (error) {
      console.error("Error updating feature:", error);
      toast.error("Erro ao salvar alteração");
      // Rollback
      setFeatures(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  if (!isDev) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Configuração de Módulos (Feature Flags)
          </CardTitle>
          <CardDescription>Persistência no Banco de Dados (public.system_settings)</CardDescription>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchFeatures} 
          disabled={isLoading}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureToggle 
            icon={<Package className="h-4 w-4" />}
            label="Sistema de Carrinho (B2C/Legado)"
            description="Exibe MiniCart e CartHeader para fluxo não-Sicoob."
            enabled={features.feature_cart_system}
            onToggle={() => toggleFeature('feature_cart_system')}
          />
          <FeatureToggle 
            icon={<MessageSquare className="h-4 w-4" />}
            label="Chat Direto Vendedor-Cliente"
            description="Canal de comunicação persistente em tempo real."
            enabled={features.feature_direct_chat}
            onToggle={() => toggleFeature('feature_direct_chat')}
          />
          <FeatureToggle 
            icon={<Zap className="h-4 w-4" />}
            label="Módulo de Blog & CMS Público"
            description="Ativa páginas institucionais dinâmicas."
            enabled={features.feature_cms_blog}
            onToggle={() => toggleFeature('feature_cms_blog')}
          />
          <FeatureToggle 
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Validação de Verbas (PAC)"
            description="Trava orçamentos acima do saldo do PA."
            enabled={features.feature_budget_enforcement}
            onToggle={() => toggleFeature('feature_budget_enforcement')}
          />
        </div>

        <div className="pt-4 border-t border-border/40">
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-tight">Higiene Técnica</p>
                <p className="text-[10px] text-muted-foreground italic">
                  Alterações refletem instantaneamente no banco de dados.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[9px] font-mono">LIVE_SYNC</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureToggle({ icon, label, description, enabled, onToggle }: any) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
      <div className="flex gap-3">
        <div className={cn("p-2 rounded-lg bg-background border border-border/50", enabled ? "text-primary" : "text-muted-foreground opacity-50")}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-bold">{label}</p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={!!enabled} onCheckedChange={onToggle} />
    </div>
  );
}
