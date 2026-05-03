import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function QaPreflightPage() {
  const { data: preflight, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["qa-preflight"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("qa_preflight_check");
      if (error) throw error;
      return data as any;
    }
  });

  const { data: monitor } = useQuery({
    queryKey: ["qa-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("qa-block-monitor");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  const allOk = preflight && preflight.users && preflight.pas && preflight.budgets && preflight.coupons && preflight.orders && (!monitor?.blocks || monitor.blocks.length === 0);

  const CheckItem = ({ label, ok }: { label: string, ok: boolean }) => (
    <div className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm">
      <span className="font-medium text-sm">{label}</span>
      {ok ? (
        <div className="flex items-center gap-2 text-green-600">
          <Badge variant="success" className="bg-green-100 text-green-700 border-green-200">OK</Badge>
          <CheckCircle2 className="h-5 w-5" />
        </div>
      ) : (
        <div className="flex items-center gap-2 text-destructive">
          <Badge variant="destructive">FALHA</Badge>
          <XCircle className="h-5 w-5" />
        </div>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-sicoob-green-dark">QA Pré-flight §0-bis</h1>
            <p className="text-muted-foreground italic">Validação de ambiente antes da execução de roteiros de teste.</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            {isRefetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Revalidar
          </Button>
        </div>

        {monitor?.blocks?.length > 0 && (
          <Card className="border-red-500 bg-red-50">
            <CardHeader className="flex flex-row items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <CardTitle className="text-red-800">🛑 BLOQUEIO CRÍTICO DETECTADO</CardTitle>
                <CardDescription className="text-red-700">A execução de QA deve ser interrompida imediatamente.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-red-700 font-medium">
                {monitor.blocks.map((b: any, i: number) => (
                  <li key={i}>{b.message}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={allOk ? "border-green-200 bg-green-50/30" : "border-amber-200"}>
            <CardHeader>
              <CardTitle className="text-lg">Checks de Banco de Dados</CardTitle>
              <CardDescription>Verificação das tabelas e fixtures necessárias.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <CheckItem label="Usuários QA (4+ contas)" ok={preflight?.users} />
                  <CheckItem label="PA de Teste (PA-QA-001)" ok={preflight?.pas} />
                  <CheckItem label="Orçamentos de PA (pa_budgets)" ok={preflight?.budgets} />
                  <CheckItem label="Cupons Canônicos (BEMVINDO10)" ok={preflight?.coupons} />
                  <CheckItem label="Massa de Pedidos" ok={preflight?.orders} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instruções de QA</CardTitle>
              <CardDescription>Critérios de continuidade e ferramentas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                <h4 className="font-bold text-sm">Resumo Geral</h4>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {allOk ? (
                    <span className="text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-7 w-7" /> AMBIENTE PRONTO
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-7 w-7" /> AMBIENTE INSTÁVEL
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Se houver falhas, rode <code>npm run seed:qa</code> no console.</p>
                <p>2. Certifique-se de estar em uma <strong>aba anônima</strong> para evitar cache.</p>
                <p>3. Abra o DevTools (F12) e monitore erros na aba Console.</p>
              </div>
              <Button className="w-full" variant={allOk ? "default" : "outline"} onClick={() => window.open('https://github.com', '_blank')}>
                Ver Casos de Teste (DOD)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
