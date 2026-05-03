import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Play, ShieldCheck, Database, Users, ShoppingCart, Ticket } from "lucide-react";
import { toast } from "sonner";
import { runQaSeed } from "@/lib/qa-seed";

interface PreflightData {
  users: boolean;
  pas: boolean;
  budgets: boolean;
  coupons: boolean;
  orders: boolean;
  timestamp: string;
}

export default function PreflightPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreflightData | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function checkStatus() {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.rpc('qa_preflight_check');
      if (error) throw error;
      setData(res as unknown as PreflightData);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao validar ambiente");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await runQaSeed();
      toast.success("Seed executado com sucesso");
      await checkStatus();
    } catch (err) {
      toast.error("Falha ao executar seed");
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  const CheckItem = ({ label, status, icon: Icon }: { label: string; status: boolean; icon: any }) => (
    <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${status ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      {status ? (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> OK
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" /> Pendente
        </Badge>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-sicoob-green-dark">QA Pré-flight §0-bis</h1>
            <p className="text-muted-foreground mt-1">Validação de infraestrutura e dados para ciclos de QA</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={checkStatus} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Validar Agora
            </Button>
            <Button onClick={handleSeed} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              Executar Seed QA
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Infraestrutura QA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckItem label="Contas QA Provisionadas" status={data?.users ?? false} icon={Users} />
              <CheckItem label="PAs Configuradas" status={data?.pas ?? false} icon={ShieldCheck} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Massa de Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CheckItem label="Orçamentos na Fila" status={data?.orders ?? false} icon={ShoppingCart} />
              <CheckItem label="Verbas Ativas" status={data?.budgets ?? false} icon={Database} />
              <CheckItem label="Cupons de Teste" status={data?.coupons ?? false} icon={Ticket} />
            </CardContent>
          </Card>
        </div>

        {data?.timestamp && (
          <p className="text-[10px] text-muted-foreground text-center font-mono">
            Última verificação: {new Date(data.timestamp).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </MainLayout>
  );
}
