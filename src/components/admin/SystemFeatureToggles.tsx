import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Zap, 
  MessageSquare, 
  Settings, 
  ArrowRight, 
  Smartphone, 
  ShieldCheck,
  Package,
  Code2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function SystemFeatureToggles() {
  const { isDev } = useAuth();
  
  // These would typically come from a DB-backed settings table
  // For now, we mock the control UI
  const [features, setFeatures] = useState({
    cart_system: true,
    cms_blog: false,
    direct_chat: false,
    marketing_newsletter: true,
    pilot_approvals: true,
    budget_enforcement: true,
  });

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isDev) return null;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Alternância de Módulos (Feature Flags)
        </CardTitle>
        <CardDescription>Ative ou desative funcionalidades globais do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureToggle 
            icon={<Package className="h-4 w-4" />}
            label="Sistema de Carrinho (B2C/Legado)"
            description="Exibe MiniCart e CartHeader para fluxo não-Sicoob."
            enabled={features.cart_system}
            onToggle={() => toggleFeature('cart_system')}
          />
          <FeatureToggle 
            icon={<MessageSquare className="h-4 w-4" />}
            label="Chat Direto Vendedor-Cliente"
            description="Canal de comunicação persistente em tempo real."
            enabled={features.direct_chat}
            onToggle={() => toggleFeature('direct_chat')}
          />
          <FeatureToggle 
            icon={<Zap className="h-4 w-4" />}
            label="Módulo de Blog & CMS Público"
            description="Ativa páginas institucionais dinâmicas."
            enabled={features.cms_blog}
            onToggle={() => toggleFeature('cms_blog')}
          />
          <FeatureToggle 
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Validação de Verbas (PAC)"
            description="Trava orçamentos acima do saldo do PA."
            enabled={features.budget_enforcement}
            onToggle={() => toggleFeature('budget_enforcement')}
          />
        </div>

        <div className="pt-4 border-t border-border/40">
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-tight">Higiene Técnica</p>
                <p className="text-[10px] text-muted-foreground italic">
                  Configurações salvas apenas para esta sessão (Mock UI)
                </p>
              </div>
            </div>
            <Button size="sm" className="h-7 text-[10px] font-bold uppercase">Sincronizar DB</Button>
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
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
