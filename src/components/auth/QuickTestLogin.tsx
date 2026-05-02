import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, User, Shield, Building2, Landmark, Rocket, RefreshCcw, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TEST_PASSWORD = import.meta.env.VITE_SICOOB_TEST_USER_PASSWORD || "password123";

const TEST_USERS = [
  {
    role: "sicoob_pa",
    label: "Posto de Atendimento (PA)",
    email: import.meta.env.VITE_SICOOB_TEST_EMAIL_PA || "pa@teste.com",
    icon: Landmark,
    description: "Cria e gerencia pedidos do posto.",
    color: "blue"
  },
  {
    role: "sicoob_singular",
    label: "Cooperativa Singular",
    email: import.meta.env.VITE_SICOOB_TEST_EMAIL_SINGULAR || "singular@teste.com",
    icon: Building2,
    description: "Aprova pedidos das PAs vinculadas.",
    color: "indigo"
  },
  {
    role: "sicoob_central",
    label: "Cooperativa Central",
    email: import.meta.env.VITE_SICOOB_TEST_EMAIL_CENTRAL || "central@teste.com",
    icon: Shield,
    description: "Visão consolidada das singulares.",
    color: "purple"
  },
  {
    role: "sicoob_gestor",
    label: "Gestor Comercial",
    email: import.meta.env.VITE_SICOOB_TEST_EMAIL_GESTOR || "gestor@teste.com",
    icon: Rocket,
    description: "Administração total e logística.",
    color: "orange"
  }
];

export function QuickTestLogin() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<Record<string, { isValid: boolean; reason?: string }>>({});
  const [isValidating, setIsValidating] = useState(true);

  const checkIntegrity = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("auth-integrity-check", {
        body: { emails: TEST_USERS.map(u => u.email) }
      });
      if (error) throw error;
      setIntegrityStatus(data || {});
    } catch (err) {
      console.error("Erro ao validar integridade:", err);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    checkIntegrity();
  }, []);

  const runSeed = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("sicoob-seed", { method: "POST" });
      if (error) throw error;
      toast({
        title: "Seed realizado com sucesso!",
        description: `Ambiente sincronizado. Órfãos removidos: ${data.report.orphans_removed.length}`,
      });
      await checkIntegrity();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Falha no seed",
        description: err.message,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    const status = integrityStatus[email];
    if (status && !status.isValid) {
      toast({
        variant: "destructive",
        title: "Usuário Inconsistente",
        description: `Este perfil está com problemas: ${status.reason}. Execute o Seed para reparar.`,
      });
      return;
    }

    setLoadingEmail(email);
    try {
      const { error } = await signIn(email, TEST_PASSWORD);
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login rápido",
          description: "Falha na autenticação. Tente rodar o Seed.",
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

  const hasInconsistency = Object.values(integrityStatus).some(s => !s.isValid);

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Acesso Rápido (Ambiente de Teste)</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={checkIntegrity}
            disabled={isValidating || isSeeding}
          >
            <RefreshCcw className={`h-3 w-3 ${isValidating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Selecione um perfil para testar o fluxo do módulo Sicoob.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2">
        {hasInconsistency && !isValidating && (
          <Alert variant="destructive" className="py-2 px-3 mb-2 bg-destructive/10 border-destructive/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-bold">Inconsistência Detectada</AlertTitle>
            <AlertDescription className="text-[10px] flex items-center justify-between">
              Alguns usuários de teste estão corrompidos.
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 text-[9px] px-2 bg-background ml-2" 
                onClick={runSeed}
                disabled={isSeeding}
              >
                {isSeeding ? "Reparando..." : "Corrigir Agora"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {TEST_USERS.map((testUser) => {
          const Icon = testUser.icon;
          const status = integrityStatus[testUser.email];
          const isInvalid = status && !status.isValid;
          
          return (
            <Button
              key={testUser.email}
              variant="outline"
              size="sm"
              className={`h-auto py-2 justify-start gap-3 bg-card hover:bg-accent transition-all group ${isInvalid ? 'opacity-60 border-destructive/30' : ''}`}
              onClick={() => handleQuickLogin(testUser.email)}
              disabled={!!loadingEmail || isSeeding || (isInvalid && !isValidating)}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isInvalid ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{testUser.label}</span>
                  {loadingEmail === testUser.email && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] animate-pulse">Entrando...</Badge>
                  )}
                  {status?.isValid && (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  )}
                  {isInvalid && (
                    <Badge variant="destructive" className="h-4 px-1 text-[9px] uppercase">Corrompido</Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {isInvalid ? `Erro: ${status.reason}` : testUser.description}
                </p>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
