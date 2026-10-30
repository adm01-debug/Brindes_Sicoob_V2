import { useState, useEffect, useCallback } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Database,
  Users,
  ShoppingCart,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { runQaSeed } from '@/lib/qa-seed';

interface PreflightData {
  users: boolean;
  pas: boolean;
  budgets: boolean;
  coupons: boolean;
  orders: boolean;
  timestamp: string;
}

const EMPTY_PREFLIGHT: PreflightData = {
  users: false,
  pas: false,
  budgets: false,
  coupons: false,
  orders: false,
  timestamp: '',
};

function CheckItem({ label, status, icon }: { label: string; status: boolean; icon: LucideIcon }) {
  const Icon = icon;
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className={`rounded-lg p-2 ${status ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <Badge variant={status ? 'success' : 'destructive'} className="gap-1">
        {status ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        {status ? 'OK' : 'Pendente'}
      </Badge>
    </div>
  );
}

function PreflightHeader({
  loading,
  seeding,
  onCheck,
  onSeed,
}: {
  loading: boolean;
  seeding: boolean;
  onCheck: () => void;
  onSeed: () => void;
}) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-sicoob-green-dark">
          QA Pré-flight §0-bis
        </h1>
        <p className="mt-1 text-muted-foreground">
          Validação de infraestrutura e dados para ciclos de QA
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCheck} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          Validar Agora
        </Button>
        <Button onClick={onSeed} disabled={seeding}>
          {seeding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Database className="mr-2 h-4 w-4" />
          )}
          Executar Seed QA
        </Button>
      </div>
    </header>
  );
}

function PreflightCards({ data }: { data: PreflightData | null }) {
  const status = data ?? EMPTY_PREFLIGHT;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Infraestrutura QA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CheckItem label="Contas QA Provisionadas" status={status.users} icon={Users} />
          <CheckItem label="PAs Configuradas" status={status.pas} icon={ShieldCheck} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Massa de Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CheckItem label="Orçamentos na Fila" status={status.orders} icon={ShoppingCart} />
          <CheckItem label="Verbas Ativas" status={status.budgets} icon={Database} />
          <CheckItem label="Cupons de Teste" status={status.coupons} icon={Ticket} />
        </CardContent>
      </Card>
    </div>
  );
}

function LastCheck({ timestamp }: { timestamp: string | undefined }) {
  if (!timestamp) return null;
  return (
    <p className="text-center font-mono text-[10px] text-muted-foreground">
      Última verificação: {new Date(timestamp).toLocaleString('pt-BR')}
    </p>
  );
}

function usePreflight() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PreflightData | null>(null);
  const [seeding, setSeeding] = useState(false);
  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data: response, error } = await supabase.rpc('qa_preflight_check');
      if (error) throw error;
      setData(response as unknown as PreflightData);
    } catch (error) {
      console.error(error);
      toast.error('Falha ao validar ambiente');
    } finally {
      setLoading(false);
    }
  }, []);
  const seed = useCallback(async () => {
    setSeeding(true);
    try {
      await runQaSeed();
      toast.success('Seed executado com sucesso');
      await checkStatus();
    } catch {
      toast.error('Falha ao executar seed');
    } finally {
      setSeeding(false);
    }
  }, [checkStatus]);
  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);
  return { loading, data, seeding, checkStatus, seed };
}

export default function PreflightPage() {
  const { loading, data, seeding, checkStatus, seed } = usePreflight();

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      <PreflightHeader
        loading={loading}
        seeding={seeding}
        onCheck={() => void checkStatus()}
        onSeed={() => void seed()}
      />
      <PreflightCards data={data} />
      <LastCheck timestamp={data?.timestamp} />
    </div>
  );
}
