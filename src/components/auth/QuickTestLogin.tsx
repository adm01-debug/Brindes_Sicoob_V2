import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Building2, Landmark, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TEST_USERS = [
  {
    role: "sicoob_pa",
    label: "Posto de Atendimento (PA)",
    email: "pa@teste.com",
    icon: Landmark,
    description: "Cria e gerencia pedidos do posto.",
    color: "blue"
  },
  {
    role: "sicoob_singular",
    label: "Cooperativa Singular",
    email: "singular@teste.com",
    icon: Building2,
    description: "Aprova pedidos das PAs vinculadas.",
    color: "indigo"
  },
  {
    role: "sicoob_central",
    label: "Cooperativa Central",
    email: "central@teste.com",
    icon: Shield,
    description: "Visão consolidada das singulares.",
    color: "purple"
  },
  {
    role: "sicoob_gestor",
    label: "Gestor Comercial",
    email: "gestor@teste.com",
    icon: Rocket,
    description: "Administração total e logística.",
    color: "orange"
  }
];

export function QuickTestLogin() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [loadingEmail, setLoadingEmail] = React.useState<string | null>(null);

  const handleQuickLogin = async (email: string) => {
    setLoadingEmail(email);
    try {
      const { error } = await signIn(email, "password123");
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login rápido",
          description: "Certifique-se de que a rotina de seed foi executada.",
        });
      } else {
        toast({
          title: "Login realizado!",
          description: `Autenticado como ${email}`,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmail(null);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Acesso Rápido (Ambiente de Teste)</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Selecione um perfil para testar o fluxo do módulo Sicoob.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2">
        {TEST_USERS.map((testUser) => {
          const Icon = testUser.icon;
          return (
            <Button
              key={testUser.email}
              variant="outline"
              size="sm"
              className="h-auto py-2 justify-start gap-3 bg-card hover:bg-accent transition-all group"
              onClick={() => handleQuickLogin(testUser.email)}
              disabled={!!loadingEmail}
            >
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{testUser.label}</span>
                  {loadingEmail === testUser.email && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] animate-pulse">Entrando...</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {testUser.description}
                </p>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
