/**
 * RlsIntegrationTestsDialog — Dispara a edge function `rls-integration-tests`
 * que valida policies RLS executando SELECT/INSERT/UPDATE/DELETE como vendedor
 * (próprios e alheios) e como admin (invocador), exibindo a matriz de resultados.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, PlayCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Op = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
interface CaseResult {
  table: string;
  actor: "seller" | "admin";
  op: Op;
  scope: "own" | "other";
  expected: "allow" | "deny";
  observed: "allow" | "deny";
  pass: boolean;
  detail?: string;
}
interface TestResponse {
  ok: boolean;
  summary: { total: number; passed: number; failed: number };
  scenarios: string[];
  results: CaseResult[];
  generatedAt: string;
  error?: string;
  message?: string;
}

function TestResultsTable({ data }: { data: TestResponse }) {
  return <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Tabela</TableHead><TableHead>Ator</TableHead><TableHead>Operação</TableHead><TableHead>Escopo</TableHead><TableHead>Esperado</TableHead><TableHead>Observado</TableHead><TableHead className="w-[60px]">OK</TableHead><TableHead>Detalhe</TableHead></TableRow></TableHeader><TableBody>{data.results.map((result, index) => <TableRow key={`${result.table}-${result.op}-${index}`} className={result.pass ? "" : "bg-destructive/5"}><TableCell className="font-mono text-xs">{result.table}</TableCell><TableCell><Badge variant={result.actor === "admin" ? "secondary" : "outline"}>{result.actor}</Badge></TableCell><TableCell className="font-mono text-xs">{result.op}</TableCell><TableCell><Badge variant={result.scope === "own" ? "default" : "outline"}>{result.scope}</Badge></TableCell><TableCell className="font-mono text-xs">{result.expected}</TableCell><TableCell className="font-mono text-xs">{result.observed}</TableCell><TableCell>{result.pass ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell><TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={result.detail}>{result.detail}</TableCell></TableRow>)}</TableBody></Table></div>;
}

function useRlsIntegrationTests() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<TestResponse | null>(null);

  async function run() {
    setRunning(true);
    setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke<TestResponse>("rls-integration-tests", {
        body: {},
      });
      if (error) throw new Error(error.message);
      if (!res) throw new Error("sem resposta");
      setData(res);
      if (res.ok) toast.success(`RLS ✓ ${res.summary.passed}/${res.summary.total} casos`);
      else toast.warning(`RLS ${res.summary.failed} falha(s) em ${res.summary.total} casos`);
    } catch (e) {
      toast.error(`Falha ao rodar testes: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  return { open, setOpen, running, data, run };
}

export function RlsIntegrationTestsDialog() {
  const state = useRlsIntegrationTests();

  return (
    <Dialog open={state.open} onOpenChange={state.setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ShieldCheck className="h-4 w-4" /> Testar RLS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Testes de integração RLS
          </DialogTitle>
          <DialogDescription>
            Cria 2 usuários temporários e executa SELECT/INSERT/UPDATE/DELETE em registros próprios e alheios
            como vendedor, e SELECT como admin. Limpeza automática ao final.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <Button onClick={state.run} disabled={state.running} className="gap-2">
            {state.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {state.running ? "Executando..." : "Rodar testes"}
          </Button>
          {state.data && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={state.data.ok ? "default" : "destructive"}>
                {state.data.ok ? "Todos passaram" : `${state.data.summary.failed} falha(s)`}
              </Badge>
              <span className="text-muted-foreground">
                {state.data.summary.passed}/{state.data.summary.total} casos · tabelas: {state.data.scenarios.join(", ")}
              </span>
            </div>
          )}
        </div>

        {state.data && <TestResultsTable data={state.data} />}
      </DialogContent>
    </Dialog>
  );
}
