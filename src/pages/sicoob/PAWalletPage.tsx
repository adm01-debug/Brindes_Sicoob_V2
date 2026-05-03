import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, AlertCircle, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MainLayout } from "@/components/layout/MainLayout";

export default function PAWalletPage() {
  const { user } = useAuth();
  
  const { data: budget, isLoading } = useQuery({
    queryKey: ["pa-budget", user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pa_id")
        .eq("id", user?.id)
        .single();
        
      if (!profile?.pa_id) return null;

      const { data, error } = await supabase
        .from("pa_budgets")
        .select("*")
        .eq("pa_id", profile.pa_id)
        .order("month_year", { ascending: false })
        .limit(1)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const spentPercent = budget ? (Number(budget.current_spent) / Number(budget.monthly_limit)) * 100 : 0;
  const remaining = budget ? Number(budget.monthly_limit) - Number(budget.current_spent) : 0;

  return (
    <MainLayout>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-display text-sicoob-green-dark">Gestão de Verba</h1>
            <p className="text-sm text-muted-foreground italic">Controle seu saldo e garanta o abastecimento da sua agência.</p>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border/40">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Maio, 2026</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[1.5px] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Verba Mensal</CardTitle>
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(budget?.monthly_limit || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">Limite total aprovado pela Singular</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Consumido</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(budget?.current_spent || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">{spentPercent.toFixed(1)}% do limite utilizado</p>
            </CardContent>
          </Card>

          <Card className="border-[1.5px] shadow-sm bg-sicoob-green/5 border-sicoob-green/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
              <Wallet className="w-4 h-4 text-sicoob-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sicoob-green-dark">{formatCurrency(remaining)}</div>
              <p className="text-xs text-muted-foreground mt-1 text-sicoob-green-dark/80 font-medium">Disponível para novos pedidos</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[1.5px]">
          <CardHeader>
            <CardTitle>Status da Utilização</CardTitle>
            <CardDescription>Visualização gráfica do consumo de verba em tempo real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Progresso de Consumo</span>
                <span className={cn(spentPercent > 90 ? "text-red-600" : "text-sicoob-green")}>{spentPercent.toFixed(1)}%</span>
              </div>
              <Progress 
                value={spentPercent} 
                className="h-3" 
                indicatorClassName={spentPercent > 90 ? "bg-red-500" : "bg-sicoob-green"}
              />
            </div>

            {spentPercent > 90 && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Limite Crítico</AlertTitle>
                <AlertDescription>
                  Você atingiu mais de 90% da verba mensal. Novos pedidos podem exigir aprovação manual da Singular.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
